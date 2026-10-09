package com.norvodesigns.lectio.ui.components

import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.automirrored.outlined.Notes
import androidx.compose.material.icons.automirrored.outlined.Undo
import androidx.compose.material.icons.automirrored.outlined.HelpOutline
import androidx.compose.material.icons.automirrored.outlined.ListAlt
import androidx.compose.material.icons.automirrored.outlined.LibraryBooks
import androidx.compose.material.icons.automirrored.outlined.MenuBook
import androidx.compose.material.icons.automirrored.outlined.Send
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.outlined.UnfoldMore
import androidx.compose.material.icons.outlined.RemoveCircleOutline
import androidx.compose.material.icons.outlined.AddCircleOutline
import androidx.compose.material.icons.outlined.NotificationsActive
import androidx.compose.material.icons.outlined.NotificationsOff
import androidx.compose.material.icons.outlined.CloudUpload
import androidx.compose.material.icons.outlined.Eco
import androidx.compose.material.icons.outlined.Pause
import androidx.compose.material.icons.outlined.People
import androidx.compose.material.icons.outlined.ManageAccounts
import androidx.compose.material.icons.outlined.WorkspacePremium
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.AccountCircle
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.ArrowUpward
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.AutoFixHigh
import androidx.compose.material.icons.outlined.Bolt
import androidx.compose.material.icons.outlined.Book
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.CallSplit
import androidx.compose.material.icons.outlined.CenterFocusStrong
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Checklist
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.CloudDone
import androidx.compose.material.icons.outlined.CloudOff
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Dns
import androidx.compose.material.icons.outlined.Download
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.EditNote
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.material.icons.outlined.ExpandMore
import androidx.compose.material.icons.outlined.Explore
import androidx.compose.material.icons.outlined.FilterList
import androidx.compose.material.icons.outlined.Flag
import androidx.compose.material.icons.outlined.FormatQuote
import androidx.compose.material.icons.outlined.FormatSize
import androidx.compose.material.icons.outlined.GraphicEq
import androidx.compose.material.icons.outlined.GridView
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.Hardware
import androidx.compose.material.icons.outlined.Key
import androidx.compose.material.icons.outlined.Layers
import androidx.compose.material.icons.outlined.LocalFireDepartment
import androidx.compose.material.icons.outlined.MarkEmailUnread
import androidx.compose.material.icons.outlined.MoreHoriz
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.PanTool
import androidx.compose.material.icons.outlined.PersonRemove
import androidx.compose.material.icons.outlined.PlayArrow
import androidx.compose.material.icons.outlined.RadioButtonChecked
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Replay
import androidx.compose.material.icons.outlined.Route
import androidx.compose.material.icons.outlined.School
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.Shuffle
import androidx.compose.material.icons.outlined.Style
import androidx.compose.material.icons.outlined.Sync
import androidx.compose.material.icons.outlined.TextFields
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.Timer
import androidx.compose.material.icons.outlined.TouchApp
import androidx.compose.material.icons.outlined.Translate
import androidx.compose.material.icons.outlined.Upload
import androidx.compose.material.icons.outlined.Verified
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.Warning
import androidx.compose.material.icons.outlined.WbTwilight
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * The iOS app names its icons with SF Symbols; here the same names map to the
 * closest Material symbol, so a screen reads the same on both.
 */
object Symbols {
    fun of(name: String): ImageVector = when (name) {
        "sun.horizon" -> Icons.Outlined.WbTwilight
        "graduationcap" -> Icons.Outlined.School
        "book.closed" -> Icons.AutoMirrored.Outlined.MenuBook
        "books.vertical" -> Icons.AutoMirrored.Outlined.LibraryBooks
        "book" -> Icons.Outlined.Book
        "rectangle.on.rectangle.angled" -> Icons.Outlined.Style
        "rectangle.stack" -> Icons.Outlined.Layers
        "checklist" -> Icons.Outlined.Checklist
        "character.book.closed" -> Icons.Outlined.Translate
        "eye" -> Icons.Outlined.Visibility
        "waveform.path" -> Icons.Outlined.GraphicEq
        "hammer" -> Icons.Outlined.Hardware
        "text.book.closed" -> Icons.AutoMirrored.Outlined.LibraryBooks
        "wand.and.stars" -> Icons.Outlined.AutoFixHigh
        "building.columns" -> Icons.Outlined.AccountBalance
        "pencil.and.list.clipboard" -> Icons.Outlined.EditNote
        "timer" -> Icons.Outlined.Timer
        "calendar" -> Icons.Outlined.CalendarMonth
        "laurel.leading" -> Icons.Outlined.EmojiEvents
        "person.3" -> Icons.Outlined.Groups
        "gearshape" -> Icons.Outlined.Settings
        "magnifyingglass" -> Icons.Outlined.Search
        "text.quote" -> Icons.Outlined.FormatQuote
        "flame" -> Icons.Outlined.LocalFireDepartment
        "sparkles" -> Icons.Outlined.AutoAwesome
        "checkmark" -> Icons.Outlined.Check
        "checkmark.seal" -> Icons.Outlined.Verified
        "checkmark.circle" -> Icons.Outlined.CheckCircle
        "checkmark.circle.fill" -> Icons.Filled.CheckCircle
        "xmark" -> Icons.Outlined.Close
        "xmark.circle.fill" -> Icons.Filled.Cancel
        "arrow.counterclockwise" -> Icons.Outlined.Replay
        "chevron.right" -> Icons.AutoMirrored.Outlined.KeyboardArrowRight
        "chevron.left" -> Icons.AutoMirrored.Outlined.KeyboardArrowLeft
        "chevron.down" -> Icons.Outlined.ExpandMore
        "trash" -> Icons.Outlined.Delete
        "shuffle" -> Icons.Outlined.Shuffle
        "scope" -> Icons.Outlined.CenterFocusStrong
        "play.circle.fill" -> Icons.Filled.PlayCircle
        "play.fill" -> Icons.Filled.PlayArrow
        "play" -> Icons.Outlined.PlayArrow
        "hand.raised" -> Icons.Outlined.PanTool
        "hand.tap" -> Icons.Outlined.TouchApp
        "square.grid.2x2" -> Icons.Outlined.GridView
        "safari" -> Icons.Outlined.Explore
        "plus" -> Icons.Outlined.Add
        "exclamationmark.triangle" -> Icons.Outlined.Warning
        "tray.and.arrow.down" -> Icons.Outlined.Download
        "textformat.size" -> Icons.Outlined.FormatSize
        "text.bubble.fill" -> Icons.Outlined.ChatBubbleOutline
        "text.alignleft" -> Icons.AutoMirrored.Outlined.Notes
        "square.and.pencil" -> Icons.Outlined.Edit
        "square.and.arrow.up" -> Icons.Outlined.Share
        "square.and.arrow.down" -> Icons.Outlined.Upload
        "rectangle.portrait.and.arrow.right" -> Icons.AutoMirrored.Outlined.Logout
        "questionmark.circle" -> Icons.AutoMirrored.Outlined.HelpOutline
        "point.bottomleft.forward.to.point.topright.scurvepath" -> Icons.Outlined.Route
        "person.crop.circle" -> Icons.Outlined.AccountCircle
        "person.badge.minus" -> Icons.Outlined.PersonRemove
        "list.bullet.rectangle" -> Icons.AutoMirrored.Outlined.ListAlt
        "line.3.horizontal.decrease" -> Icons.Outlined.FilterList
        "largecircle.fill.circle" -> Icons.Outlined.RadioButtonChecked
        "key" -> Icons.Outlined.Key
        "icloud.slash" -> Icons.Outlined.CloudOff
        "checkmark.icloud" -> Icons.Outlined.CloudDone
        "flag" -> Icons.Outlined.Flag
        "envelope.badge" -> Icons.Outlined.MarkEmailUnread
        "ellipsis" -> Icons.Outlined.MoreHoriz
        "bookmark" -> Icons.Outlined.BookmarkBorder
        "bookmark.fill" -> Icons.Filled.Bookmark
        "bolt" -> Icons.Outlined.Bolt
        "bell" -> Icons.Outlined.Notifications
        "arrow.uturn.backward" -> Icons.AutoMirrored.Outlined.Undo
        "arrow.up" -> Icons.Outlined.ArrowUpward
        "arrow.turn.up.right" -> Icons.AutoMirrored.Outlined.Send
        "arrow.triangle.branch" -> Icons.Outlined.CallSplit
        "arrow.triangle.2.circlepath" -> Icons.Outlined.Sync
        "arrow.left" -> Icons.AutoMirrored.Outlined.ArrowBack
        "textformat" -> Icons.Outlined.TextFields
        "refresh" -> Icons.Outlined.Refresh
        "paperplane" -> Icons.AutoMirrored.Outlined.Send
        "server.rack" -> Icons.Outlined.Dns
        "flag.slash" -> Icons.Outlined.Flag
        "chevron.up.chevron.down" -> Icons.Outlined.UnfoldMore
        "minus.circle" -> Icons.Outlined.RemoveCircleOutline
        "plus.circle" -> Icons.Outlined.AddCircleOutline
        "arrow.uturn.backward.circle" -> Icons.AutoMirrored.Outlined.Undo
        "bell.badge" -> Icons.Outlined.NotificationsActive
        "bell.slash" -> Icons.Outlined.NotificationsOff
        "checkmark.seal.fill" -> Icons.Filled.Verified
        "flag.fill" -> Icons.Filled.Flag
        "icloud.and.arrow.up" -> Icons.Outlined.CloudUpload
        "leaf" -> Icons.Outlined.Eco
        "pause" -> Icons.Outlined.Pause
        "person.2" -> Icons.Outlined.People
        "person.2.badge.gearshape" -> Icons.Outlined.ManageAccounts
        "seal", "seal.fill" -> Icons.Outlined.WorkspacePremium
        else -> Icons.Outlined.Book
    }
}

/** An icon by its SF Symbol name. */
@Composable
fun Symbol(name: String, tint: Color = Color.Unspecified, size: Dp = 24.dp, modifier: Modifier = Modifier, contentDescription: String? = null) {
    Icon(Symbols.of(name), contentDescription, modifier.size(size), tint = if (tint == Color.Unspecified) androidx.compose.material3.LocalContentColor.current else tint)
}
