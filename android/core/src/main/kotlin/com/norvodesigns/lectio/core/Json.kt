package com.norvodesigns.lectio.core

import kotlinx.serialization.KSerializer
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import java.math.BigDecimal
import kotlin.math.abs

/**
 * A JSON value whose objects remember their key order.
 *
 * The student's progress is synced as one JSON document shared with the web
 * app, and two things about it rule out decoding it straight into fixed
 * classes and unordered maps:
 *
 * - Key order carries meaning. The web store caps `scansionDrafts` by dropping
 *   the earliest-inserted keys (JavaScript objects iterate in insertion order).
 * - Fields this app doesn't know about must survive. When the web app grows a
 *   new field, an older build that decoded into fixed classes and re-encoded
 *   would silently delete it on its next push.
 *
 * So the sync layer works on [JSONValue] directly, and typed models are
 * decoded from it only where the UI needs them. A port of the iOS app's
 * `JSONValue`.
 */
sealed interface JSONValue {
    data object Null : JSONValue
    data class Bool(val value: Boolean) : JSONValue
    data class Num(val value: Double) : JSONValue
    data class Str(val value: String) : JSONValue
    data class Arr(val items: List<JSONValue>) : JSONValue
    data class Obj(val value: JSONObject) : JSONValue

    val stringValue: String? get() = (this as? Str)?.value
    val doubleValue: Double? get() = (this as? Num)?.value
    val intValue: Int? get() = (this as? Num)?.value?.toInt()
    val boolValue: Boolean? get() = (this as? Bool)?.value
    val arrayValue: List<JSONValue>? get() = (this as? Arr)?.items
    val objectValue: JSONObject? get() = (this as? Obj)?.value

    /** JavaScript truthiness, for ports of `filter(Boolean)` and friends. */
    val isTruthy: Boolean
        get() = when (this) {
            Null -> false
            is Bool -> value
            is Num -> value != 0.0 && !value.isNaN()
            is Str -> value.isNotEmpty()
            is Arr, is Obj -> true
        }

    operator fun get(key: String): JSONValue? = objectValue?.get(key)

    /** Compact JSON in the shape `JSON.stringify` produces. */
    fun serialized(): String = StringBuilder(256).also { write(it) }.toString()

    private fun write(out: StringBuilder) {
        when (this) {
            Null -> out.append("null")
            is Bool -> out.append(if (value) "true" else "false")
            is Num -> out.append(format(value))
            is Str -> writeString(value, out)
            is Arr -> {
                out.append('[')
                items.forEachIndexed { i, v ->
                    if (i > 0) out.append(',')
                    v.write(out)
                }
                out.append(']')
            }
            is Obj -> {
                out.append('{')
                var first = true
                for ((k, v) in value) {
                    if (!first) out.append(',')
                    first = false
                    writeString(k, out)
                    out.append(':')
                    v.write(out)
                }
                out.append('}')
            }
        }
    }

    /** Decodes a typed model from this value. */
    fun <T> decode(serializer: KSerializer<T>): T = LectioJson.decodeFromJsonElement(serializer, toElement())

    fun toElement(): JsonElement = when (this) {
        Null -> JsonNull
        is Bool -> JsonPrimitive(value)
        is Num -> JsonPrimitive(value.toNumberLiteral())
        is Str -> JsonPrimitive(value)
        is Arr -> JsonArray(items.map { it.toElement() })
        is Obj -> JsonObject(LinkedHashMap<String, JsonElement>().also { m -> value.forEach { (k, v) -> m[k] = v.toElement() } })
    }

    companion object {
        fun parse(text: String): JSONValue = JSONParser(text).parseDocument()

        /** Whole numbers without a decimal point, as `JSON.stringify` writes them. */
        fun format(n: Double): String {
            if (!n.isFinite()) return "null" // JSON.stringify(NaN) === "null"
            if (n == Math.rint(n) && abs(n) < 1e15) return n.toLong().toString()
            val a = abs(n)
            if (a >= 1e-6 && a < 1e21) return BigDecimal(n.toString()).toPlainString()
            // JavaScript writes 1e-7 and 1e+21, not Kotlin's 1.0E-7.
            val s = n.toString()
            val e = s.indexOf('E')
            if (e < 0) return s
            var mantissa = s.substring(0, e)
            if (mantissa.endsWith(".0")) mantissa = mantissa.dropLast(2)
            val exp = s.substring(e + 1)
            return mantissa + "e" + (if (exp.startsWith("-")) exp else "+$exp")
        }

        fun of(value: Any?): JSONValue = when (value) {
            null -> Null
            is JSONValue -> value
            is Boolean -> Bool(value)
            is Number -> Num(value.toDouble())
            is String -> Str(value)
            is JSONObject -> Obj(value)
            is List<*> -> Arr(value.map { of(it) })
            is Map<*, *> -> Obj(JSONObject().also { o -> value.forEach { (k, v) -> o[k as String] = of(v) } })
            else -> error("Cannot represent ${value::class} as JSON")
        }

        fun fromElement(e: JsonElement): JSONValue = when (e) {
            is JsonNull -> Null
            is JsonPrimitive -> when {
                e.isString -> Str(e.content)
                e.content == "true" -> Bool(true)
                e.content == "false" -> Bool(false)
                else -> Num(e.content.toDouble())
            }
            is JsonArray -> Arr(e.map { fromElement(it) })
            is JsonObject -> Obj(JSONObject().also { o -> e.forEach { (k, v) -> o[k] = fromElement(v) } })
        }

        /** Encodes a typed model into a value. Nulls are left out. */
        fun <T> encoding(serializer: KSerializer<T>, value: T): JSONValue =
            fromElement(LectioJson.encodeToJsonElement(serializer, value))

        private fun writeString(s: String, out: StringBuilder) {
            out.append('"')
            for (c in s) {
                when (c) {
                    '"' -> out.append("\\\"")
                    '\\' -> out.append("\\\\")
                    '\n' -> out.append("\\n")
                    '\r' -> out.append("\\r")
                    '\t' -> out.append("\\t")
                    '\b' -> out.append("\\b")
                    '\u000C' -> out.append("\\f")
                    else -> if (c.code < 0x20) out.append("\\u%04x".format(c.code)) else out.append(c)
                }
            }
            out.append('"')
        }
    }
}

private fun Double.toNumberLiteral(): Number =
    if (this == Math.rint(this) && abs(this) < 1e15) toLong() else this

/** Shared configuration for decoding typed models. */
val LectioJson: Json = Json {
    ignoreUnknownKeys = true
    explicitNulls = false
    encodeDefaults = true
    isLenient = true
}

inline fun <reified T> JSONValue.decode(): T = decode(kotlinx.serialization.serializer<T>())

/**
 * A JSON object that iterates in insertion order, like a JavaScript object
 * with string keys: assigning to an existing key keeps its position, a new
 * key goes to the end, and removing a key closes the gap.
 *
 * Mutable, with value semantics by convention: [copy] before changing
 * something a caller may still hold, and treat anything returned by [obj]
 * or [get] as read-only.
 */
class JSONObject(private val map: LinkedHashMap<String, JSONValue> = LinkedHashMap()) : Iterable<Pair<String, JSONValue>> {
    constructor(vararg pairs: Pair<String, JSONValue>) : this() {
        for ((k, v) in pairs) this[k] = v
    }

    val keys: List<String> get() = map.keys.toList()
    val size: Int get() = map.size
    val isEmpty: Boolean get() = map.isEmpty()

    operator fun get(key: String): JSONValue? = map[key]

    operator fun set(key: String, value: JSONValue?) {
        if (value == null) map.remove(key) else map[key] = value
    }

    fun remove(key: String) {
        map.remove(key)
    }

    operator fun contains(key: String): Boolean = map.containsKey(key)

    fun copy(): JSONObject = JSONObject(LinkedHashMap(map))

    /** Drops the first [n] keys in iteration order. */
    fun removeFirst(n: Int) {
        if (n <= 0) return
        val it = map.keys.iterator()
        var left = n
        while (left > 0 && it.hasNext()) {
            it.next()
            it.remove()
            left--
        }
    }

    override fun iterator(): Iterator<Pair<String, JSONValue>> =
        map.entries.asSequence().map { it.key to it.value }.iterator()

    val values: Collection<JSONValue> get() = map.values

    /** Structural equality, blind to key order. */
    override fun equals(other: Any?): Boolean = other is JSONObject && map == other.map
    override fun hashCode(): Int = map.hashCode()

    /** This object with every field of [other] written over it. */
    fun overlaid(with: JSONObject): JSONObject {
        val out = copy()
        for ((k, v) in with) out[k] = v
        return out
    }

    fun obj(key: String): JSONObject = (map[key] as? JSONValue.Obj)?.value ?: JSONObject()
    fun array(key: String): List<JSONValue> = (map[key] as? JSONValue.Arr)?.items ?: emptyList()

    fun toValue(): JSONValue = JSONValue.Obj(this)
}

fun jobj(vararg pairs: Pair<String, Any?>): JSONValue.Obj {
    val o = JSONObject()
    for ((k, v) in pairs) o[k] = JSONValue.of(v)
    return JSONValue.Obj(o)
}

fun jarr(vararg items: Any?): JSONValue.Arr = JSONValue.Arr(items.map { JSONValue.of(it) })

class JSONParseError(val msg: String, val offset: Int) : Exception("JSON parse error at $offset: $msg")

private class JSONParser(private val s: String) {
    private var i = 0

    fun parseDocument(): JSONValue {
        skipWhitespace()
        val v = parseValue(0)
        skipWhitespace()
        if (i < s.length) throw err("trailing characters")
        return v
    }

    private fun err(msg: String) = JSONParseError(msg, i)

    private fun skipWhitespace() {
        while (i < s.length) {
            val c = s[i]
            if (c == ' ' || c == '\t' || c == '\n' || c == '\r') i++ else break
        }
    }

    private fun expect(lit: String) {
        if (!s.startsWith(lit, i)) throw err("expected $lit")
        i += lit.length
    }

    private fun parseValue(depth: Int): JSONValue {
        if (depth >= 512) throw err("nesting too deep")
        if (i >= s.length) throw err("unexpected end of input")
        return when (s[i]) {
            '{' -> JSONValue.Obj(parseObject(depth))
            '[' -> JSONValue.Arr(parseArray(depth))
            '"' -> JSONValue.Str(parseString())
            't' -> { expect("true"); JSONValue.Bool(true) }
            'f' -> { expect("false"); JSONValue.Bool(false) }
            'n' -> { expect("null"); JSONValue.Null }
            else -> JSONValue.Num(parseNumber())
        }
    }

    private fun parseObject(depth: Int): JSONObject {
        i++
        val obj = JSONObject()
        skipWhitespace()
        if (i < s.length && s[i] == '}') { i++; return obj }
        while (true) {
            skipWhitespace()
            if (i >= s.length || s[i] != '"') throw err("expected object key")
            val key = parseString()
            skipWhitespace()
            if (i >= s.length || s[i] != ':') throw err("expected ':'")
            i++
            skipWhitespace()
            // A repeated key keeps its first position and takes the last value, as JSON.parse does.
            obj[key] = parseValue(depth + 1)
            skipWhitespace()
            if (i >= s.length) throw err("unterminated object")
            if (s[i] == ',') { i++; continue }
            if (s[i] == '}') { i++; return obj }
            throw err("expected ',' or '}'")
        }
    }

    private fun parseArray(depth: Int): List<JSONValue> {
        i++
        val out = ArrayList<JSONValue>()
        skipWhitespace()
        if (i < s.length && s[i] == ']') { i++; return out }
        while (true) {
            skipWhitespace()
            out.add(parseValue(depth + 1))
            skipWhitespace()
            if (i >= s.length) throw err("unterminated array")
            if (s[i] == ',') { i++; continue }
            if (s[i] == ']') { i++; return out }
            throw err("expected ',' or ']'")
        }
    }

    private fun parseNumber(): Double {
        val start = i
        while (i < s.length && s[i] in "+-0123456789.eE") i++
        val text = s.substring(start, i)
        val n = if (i > start) text.toDoubleOrNull() else null
        if (n == null) {
            i = start
            throw err("invalid value")
        }
        return n
    }

    private fun parseString(): String {
        i++
        val start = i
        // Fast path: no escapes.
        while (i < s.length && s[i] != '"' && s[i] != '\\') i++
        if (i < s.length && s[i] == '"') {
            val str = s.substring(start, i)
            i++
            return str
        }
        val sb = StringBuilder(s.substring(start, i))
        while (true) {
            if (i >= s.length) throw err("unterminated string")
            val c = s[i]
            if (c == '"') { i++; break }
            if (c != '\\') { sb.append(c); i++; continue }
            i++
            if (i >= s.length) throw err("unterminated escape")
            val e = s[i++]
            when (e) {
                '"' -> sb.append('"')
                '\\' -> sb.append('\\')
                '/' -> sb.append('/')
                'b' -> sb.append('\b')
                'f' -> sb.append('\u000C')
                'n' -> sb.append('\n')
                'r' -> sb.append('\r')
                't' -> sb.append('\t')
                'u' -> {
                    if (i + 4 > s.length) throw err("invalid \\u escape")
                    val v = s.substring(i, i + 4).toIntOrNull(16) ?: throw err("invalid \\u escape")
                    i += 4
                    sb.append(v.toChar())
                }
                else -> throw err("invalid escape")
            }
        }
        return sb.toString()
    }
}
