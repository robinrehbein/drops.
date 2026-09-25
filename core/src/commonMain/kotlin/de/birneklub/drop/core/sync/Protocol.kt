package de.birneklub.drop.core.sync

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement

/**
 * Wire protocol between the apps and the optional sync server.
 * The apps work fully offline; an account only adds backup and multi-device sync.
 */
object SyncCollections {
    const val BEANS = "beans"
    const val RECIPES = "recipes"
    const val SHOTS = "shots"
    const val EQUIPMENT = "equipment"
    const val TASKS = "tasks"

    val all: Set<String> = setOf(BEANS, RECIPES, SHOTS, EQUIPMENT, TASKS)
}

/** One entity in transit. [data] is null for deletions (tombstones). */
@Serializable
data class SyncRecord(
    val collection: String,
    val id: String,
    /** Unix epoch milliseconds of the last local change. */
    val updatedAt: Long,
    val deleted: Boolean = false,
    val data: JsonElement? = null,
)

@Serializable
data class SyncRequest(
    val deviceId: String,
    /** serverTime from the previous response, 0 on first sync. */
    val since: Long,
    val changes: List<SyncRecord>,
)

@Serializable
data class SyncResponse(
    val serverTime: Long,
    /** Records changed on the server after [SyncRequest.since], excluding the ones this request just wrote. */
    val changes: List<SyncRecord>,
)

@Serializable
data class RegisterRequest(
    val email: String,
    val password: String,
    val deviceName: String,
    val platform: String,
)

@Serializable
data class LoginRequest(
    val email: String,
    val password: String,
    val deviceName: String,
    val platform: String,
)

@Serializable
data class AuthResponse(
    val token: String,
    val userId: String,
    val email: String,
    val deviceId: String,
)

@Serializable
data class MeResponse(val userId: String, val email: String, val devices: List<DeviceInfo>)

@Serializable
data class DeviceInfo(
    val deviceId: String,
    val name: String,
    val platform: String,
    val lastSeenAt: Long,
)

@Serializable
data class ApiError(val code: String, val message: String)

object SyncLimits {
    const val MAX_RECORDS_PER_REQUEST = 5_000
    const val MAX_ID_LENGTH = 64
    const val MIN_PASSWORD_LENGTH = 8
}

/** Shared JSON configuration so apps and server encode records identically. */
val DropsJson: Json = Json {
    ignoreUnknownKeys = true
    encodeDefaults = true
    explicitNulls = false
}
