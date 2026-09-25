package de.birneklub.drop.android

import android.app.Activity
import android.content.Context
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import de.birneklub.drop.core.stats.PurchaseVerifyResponse
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * One-time "Founding Member" purchase through Google Play. The product has to
 * exist in the Play Console as an in-app product with id [PRODUCT_ID]; until
 * then (or without Play) the state stays [State.Unavailable] and the app shows
 * the offer without a buy button.
 */
class FoundingMember(
    context: Context,
    private val scope: CoroutineScope,
    /** Asks our server to confirm the purchase with Google; null = not possible right now. */
    private val verify: suspend (productId: String, token: String) -> String?,
    private val onNewPurchase: () -> Unit,
) {
    sealed interface State {
        data object Loading : State
        data object Unavailable : State
        data class Available(val price: String) : State
        data object Pending : State
        data object Owned : State
    }

    private val _state = MutableStateFlow<State>(State.Loading)
    val state: StateFlow<State> = _state.asStateFlow()
    private var details: ProductDetails? = null

    private val client: BillingClient = BillingClient.newBuilder(context.applicationContext)
        .setListener { result, purchases -> if (result.responseCode == BillingClient.BillingResponseCode.OK) handle(purchases.orEmpty(), fresh = true) }
        .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
        .build()

    fun connect() {
        if (client.isReady) return refresh()
        client.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                if (result.responseCode == BillingClient.BillingResponseCode.OK) refresh() else _state.value = State.Unavailable
            }

            override fun onBillingServiceDisconnected() {
                if (_state.value == State.Loading) _state.value = State.Unavailable
            }
        })
    }

    private fun refresh() {
        client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build()) { _, purchases ->
            handle(purchases, fresh = false)
            if (_state.value == State.Owned || _state.value == State.Pending) return@queryPurchasesAsync
            refreshOffer()
        }
    }

    private fun refreshOffer() {
        val product = QueryProductDetailsParams.Product.newBuilder().setProductId(PRODUCT_ID).setProductType(BillingClient.ProductType.INAPP).build()
        client.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(listOf(product)).build()) { result, found ->
            details = found.productDetailsList.firstOrNull()
            val price = details?.oneTimePurchaseOfferDetails?.formattedPrice
            _state.value = if (result.responseCode == BillingClient.BillingResponseCode.OK && price != null) State.Available(price) else State.Unavailable
        }
    }

    fun buy(activity: Activity) {
        val d = details ?: return
        val params = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(listOf(BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(d).build()))
            .build()
        client.launchBillingFlow(activity, params)
    }

    private fun handle(purchases: List<Purchase>, fresh: Boolean) {
        val ours = purchases.filter { PRODUCT_ID in it.products }
        val bought = ours.firstOrNull { it.purchaseState == Purchase.PurchaseState.PURCHASED }
        when {
            bought != null -> {
                // Unacknowledged purchases are refunded by Play after three days.
                if (!bought.isAcknowledged) {
                    client.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(bought.purchaseToken).build()) {}
                }
                _state.value = State.Owned
                // The server double-checks with Google; a refund or a forged token takes the status back.
                scope.launch {
                    when (verify(PRODUCT_ID, bought.purchaseToken)) {
                        PurchaseVerifyResponse.CANCELED, PurchaseVerifyResponse.INVALID -> refreshOffer()
                        else -> if (fresh) onNewPurchase()
                    }
                }
            }
            ours.any { it.purchaseState == Purchase.PurchaseState.PENDING } -> _state.value = State.Pending
        }
    }

    companion object {
        const val PRODUCT_ID = "founding_member"
    }
}
