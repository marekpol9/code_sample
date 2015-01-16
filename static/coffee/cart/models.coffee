window.SOCIAL_CART_API_URL = '/cart/api/v1/social_cart/'
window.PERSONAL_CART_API_URL = '/cart/api/v1/personal_cart/'


SocialBuyMixin =
    _getUTCDate: ->
        now = new Date()
        return new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
                        now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds())
    getFinishesIn: ->
        finishDate = moment(this.get('finish_date'), 'YYYY-MM-DDTHH:mm:ss')
        nowUtc = @._getUTCDate()
        return finishDate.from(moment(nowUtc))
    
    isExpired: ->
        finishDate = moment(this.get('finish_date'), 'YYYY-MM-DDTHH:mm:ss')
        nowUtc = @._getUTCDate()
        return finishDate.diff(nowUtc) < 0

    toJSON: ->
        json = Backbone.Model.prototype.toJSON.apply(this)
        return _.extend(json, {
            finishes_in: @.getFinishesIn()
            is_expired: @.isExpired()
        })


# CartPersonalTag
window.CartPersonalTag = Backbone.RelationalModel.extend({ })

window.CartPersonalTagCollection = Backbone.Collection.extend
    model: CartPersonalTag
    comparator: (tag) -> return tag.get('item_name')
# /CartPersonalTag


# CartPersonalBuy
window.CartPersonalBuy = Backbone.RelationalModel.extend
    relations: [{
            type: Backbone.HasMany
            key: 'tags'
            relatedModel: 'CartPersonalTag'
            collectionType: 'CartPersonalTagCollection'
            reverseRelation: {
                key: 'buy'
            }
        }, {
            type: Backbone.HasOne
            key: 'creator'
            relatedModel: 'User'
        }]

    url: -> return "#{ PERSONAL_CART_API_URL }buys/#{ @.get('id') }/"

window.CartPersonalBuyCollection = Backbone.Collection.extend
    model: CartPersonalBuy
# /CartPersonalBuy


# CartSocialTag
window.CartSocialTag = Backbone.RelationalModel.extend({ })

window.CartSocialTagCollection = Backbone.Collection.extend
    model: CartSocialTag
    comparator: (tag) -> return tag.get('item_name')
# /CartSocialTag


# CartSocialBuy
window.CartSocialBuy = Backbone.RelationalModel.extend
    relations: [{
            type: Backbone.HasMany
            key: 'tags'
            relatedModel: 'CartSocialTag'
            collectionType: 'CartSocialTagCollection'
            reverseRelation: {
                key: 'buy'
            }
        }]

    url: -> return "#{ SOCIAL_CART_API_URL }buys/#{ @.get('id') }/"

_.extend(CartSocialBuy.prototype, SocialBuyMixin)

window.CartSocialBuyCollection = Backbone.Collection.extend
    model: CartSocialBuy
# /CartSocialBuy

# CartShippingRequest
window.CartShippingRequest = Backbone.RelationalModel.extend
    relations: [{
            type: Backbone.HasOne
            key: 'buy'
            relatedModel: 'CartSocialBuy'
            reverseRelation:
                key: 'shipping_request'
                type: Backbone.HasOne
        }]

    url: -> return @.get('resource_uri') or "#{ SOCIAL_CART_API_URL }shipping_requests/#{ @.get('id') }/"

window.CartShippingRequestCollection = Backbone.Collection.extend
    model: CartShippingRequest
# /CartShippingRequest


# CartPickupRequest
window.CartPickupRequest = Backbone.RelationalModel.extend
    relations: [{
            type: Backbone.HasOne
            key: 'buy'
            relatedModel: 'CartSocialBuy'
            reverseRelation:
                key: 'pickup_request'
                type: Backbone.HasOne
        }]

    url: -> return @.get('resource_uri') or "#{ SOCIAL_CART_API_URL }pickup_requests/#{ @.get('id') }/"

window.CartPickupRequestCollection = Backbone.Collection.extend
    model: CartPickupRequest
# /CartPickupRequest


# Cart
window.SocialCart = Backbone.RelationalModel.extend
    relations: [{
            type: Backbone.HasMany
            key: 'buys'
            relatedModel: 'CartSocialBuy'
            collectionType: 'CartSocialBuyCollection',
            reverseRelation:
                key: 'cart'
                type: Backbone.HasOne
        }, {
            type: Backbone.HasMany
            key: 'pending_shipping_requests'
            relatedModel: 'CartShippingRequest'
            collectionType: 'CartPickupRequestCollection',
            reverseRelation:
                key: 'cart'
                type: Backbone.HasOne
        }, {
            type: Backbone.HasMany
            key: 'shipping_requests'
            relatedModel: 'CartShippingRequest'
            collectionType: 'CartPickupRequestCollection',
            reverseRelation:
                key: 'cart'
                type: Backbone.HasOne
        }, {
            type: Backbone.HasMany
            key: 'pickup_requests'
            relatedModel: 'CartPickupRequest'
            collectionType: 'CartPickupRequestCollection',
            reverseRelation:
                key: 'cart'
                type: Backbone.HasOne
        }]

    url: -> return "#{ SOCIAL_CART_API_URL }pickup_requests/#{ @.get('id') }/"
# /Cart#


# ItemSocialBuy
window.ItemSocialBuy = Backbone.Model.extend
    relations: [{
            type: Backbone.HasOne
            key: 'item'
            relatedModel: 'Item'
        }, {
            type: Backbone.HasOne
            key: 'creator'
            relatedModel: 'User'
            includeInJSON: true
        }]

    url: -> return "#{ @.get('item').get('resource_uri') }buys/#{ @.get('id') }/"

_.extend(ItemSocialBuy.prototype, SocialBuyMixin)

window.ItemSocialBuyCollection = Backbone.Collection.extend
    model: ItemSocialBuy
# /ItemSocialBuy


window.ItemPersonalTag = Backbone.RelationalModel.extend
    relations: [{
            type: Backbone.HasOne
            key: 'item'
            relatedModel: 'Item'
        }]

    url: -> return "#{ @.get('item').get('resource_uri') }personal_tag/"
