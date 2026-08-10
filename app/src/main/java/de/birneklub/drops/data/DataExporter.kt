package de.birneklub.drops.data

import org.json.JSONArray
import org.json.JSONObject

/** Baut das Backup-JSON aus dem kompletten Datenbestand (Datenhoheit wie Beanconqueror). */
class DataExporter(private val database: DropsDatabase) {

    suspend fun buildJson(): String {
        val root = JSONObject()
        root.put("app", "Drops")
        root.put("schemaVersion", 2)
        root.put("exportedAt", System.currentTimeMillis())

        root.put("beans", JSONArray().apply {
            database.beanDao().getAll().forEach { bean ->
                put(JSONObject().apply {
                    put("id", bean.id)
                    put("name", bean.name)
                    putOpt("roaster", bean.roaster)
                    putOpt("roastDate", bean.roastDate?.toString())
                    putOpt("photoUri", bean.photoUri)
                    putOpt("notes", bean.notes)
                    putOpt("wouldBuyAgain", bean.wouldBuyAgain)
                    put("status", bean.status.name)
                    putOpt("frozenAttemptId", bean.frozenAttemptId)
                    putOpt("origin", bean.origin)
                    putOpt("process", bean.process)
                    putOpt("roastLevel", bean.roastLevel?.name)
                    putOpt("boughtAt", bean.boughtAt)
                    put("createdAt", bean.createdAt)
                    put("updatedAt", bean.updatedAt)
                })
            }
        })

        root.put("attempts", JSONArray().apply {
            database.attemptDao().getAll().forEach { attempt ->
                put(JSONObject().apply {
                    put("id", attempt.id)
                    put("beanId", attempt.beanId)
                    put("grindSetting", attempt.grindSetting)
                    put("doseG", attempt.doseG)
                    put("yieldG", attempt.yieldG)
                    put("timeSec", attempt.timeSec)
                    put("verdict", attempt.verdict.name)
                    putOpt("note", attempt.note)
                    put("createdAt", attempt.createdAt)
                })
            }
        })

        root.put("maintenanceTasks", JSONArray().apply {
            database.maintenanceDao().getAll().forEach { task ->
                put(JSONObject().apply {
                    put("id", task.id)
                    put("name", task.name)
                    put("category", task.category.name)
                    put("intervalDays", task.intervalDays)
                    putOpt("lastDoneAt", task.lastDoneAt)
                    put("createdAt", task.createdAt)
                })
            }
        })

        root.put("places", JSONArray().apply {
            database.placeDao().getAll().forEach { place ->
                put(JSONObject().apply {
                    put("id", place.id)
                    put("name", place.name)
                    put("city", place.city)
                    put("type", place.type.name)
                    putOpt("notes", place.notes)
                    putOpt("url", place.url)
                    put("favorite", place.favorite)
                    put("createdAt", place.createdAt)
                })
            }
        })

        return root.toString(2)
    }
}
