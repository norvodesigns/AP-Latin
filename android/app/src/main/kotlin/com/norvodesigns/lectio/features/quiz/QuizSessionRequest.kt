package com.norvodesigns.lectio.features.quiz

import androidx.compose.runtime.Immutable
import com.norvodesigns.lectio.core.Question

/** A quiz session waiting to be shown over the app: the questions to ask, and whether it is the spaced review of missed ones. */
@Immutable
data class QuizSessionRequest(val questions: List<Question>, val isReview: Boolean)
