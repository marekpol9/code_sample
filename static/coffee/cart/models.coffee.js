(function() {
  var SocialBuyMixin;

  window.SOCIAL_CART_API_URL = '/cart/api/v1/social_cart/';

  window.PERSONAL_CART_API_URL = '/cart/api/v1/personal_cart/';

  SocialBuyMixin = {
    _getUTCDate: function() {
      var now;
      now = new Date();
      return new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
    },
    getFinishesIn: function() {
      var finishDate, nowUtc;
      finishDate = moment(this.get('finish_date'), 'YYYY-MM-DDTHH:mm:ss');
      nowUtc = this._getUTCDate();
      return finishDate.from(moment(nowUtc));
    },
    isExpired: function() {
      var finishDate, nowUtc;
      finishDate = moment(this.get('finish_date'), 'YYYY-MM-DDTHH:mm:ss');
      nowUtc = this._getUTCDate();
      return finishDate.diff(nowUtc) < 0;
    },
    toJSON: function() {
      var json;
      json = Backbone.Model.prototype.toJSON.apply(this);
      return _.extend(json, {
        finishes_in: this.getFinishesIn(),
        is_expired: this.isExpired()
      });
    }
  };

  window.CartPersonalTag = Backbone.RelationalModel.extend({});

  window.CartPersonalTagCollection = Backbone.Collection.extend({
    model: CartPersonalTag,
    comparator: function(tag) {
      return tag.get('item_name');
    }
  });

  window.CartPersonalBuy = Backbone.RelationalModel.extend({
    relations: [
      {
        type: Backbone.HasMany,
        key: 'tags',
        relatedModel: 'CartPersonalTag',
        collectionType: 'CartPersonalTagCollection',
        reverseRelation: {
          key: 'buy'
        }
      }, {
        type: Backbone.HasOne,
        key: 'creator',
        relatedModel: 'User'
      }
    ],
    url: function() {
      return "" + PERSONAL_CART_API_URL + "buys/" + (this.get('id')) + "/";
    }
  });

  window.CartPersonalBuyCollection = Backbone.Collection.extend({
    model: CartPersonalBuy
  });

  window.CartSocialTag = Backbone.RelationalModel.extend({});

  window.CartSocialTagCollection = Backbone.Collection.extend({
    model: CartSocialTag,
    comparator: function(tag) {
      return tag.get('item_name');
    }
  });

  window.CartSocialBuy = Backbone.RelationalModel.extend({
    relations: [
      {
        type: Backbone.HasMany,
        key: 'tags',
        relatedModel: 'CartSocialTag',
        collectionType: 'CartSocialTagCollection',
        reverseRelation: {
          key: 'buy'
        }
      }
    ],
    url: function() {
      return "" + SOCIAL_CART_API_URL + "buys/" + (this.get('id')) + "/";
    }
  });

  _.extend(CartSocialBuy.prototype, SocialBuyMixin);

  window.CartSocialBuyCollection = Backbone.Collection.extend({
    model: CartSocialBuy
  });

  window.CartShippingRequest = Backbone.RelationalModel.extend({
    relations: [
      {
        type: Backbone.HasOne,
        key: 'buy',
        relatedModel: 'CartSocialBuy',
        reverseRelation: {
          key: 'shipping_request',
          type: Backbone.HasOne
        }
      }
    ],
    url: function() {
      return this.get('resource_uri') || ("" + SOCIAL_CART_API_URL + "shipping_requests/" + (this.get('id')) + "/");
    }
  });

  window.CartShippingRequestCollection = Backbone.Collection.extend({
    model: CartShippingRequest
  });

  window.CartPickupRequest = Backbone.RelationalModel.extend({
    relations: [
      {
        type: Backbone.HasOne,
        key: 'buy',
        relatedModel: 'CartSocialBuy',
        reverseRelation: {
          key: 'pickup_request',
          type: Backbone.HasOne
        }
      }
    ],
    url: function() {
      return this.get('resource_uri') || ("" + SOCIAL_CART_API_URL + "pickup_requests/" + (this.get('id')) + "/");
    }
  });

  window.CartPickupRequestCollection = Backbone.Collection.extend({
    model: CartPickupRequest
  });

  window.SocialCart = Backbone.RelationalModel.extend({
    relations: [
      {
        type: Backbone.HasMany,
        key: 'buys',
        relatedModel: 'CartSocialBuy',
        collectionType: 'CartSocialBuyCollection',
        reverseRelation: {
          key: 'cart',
          type: Backbone.HasOne
        }
      }, {
        type: Backbone.HasMany,
        key: 'pending_shipping_requests',
        relatedModel: 'CartShippingRequest',
        collectionType: 'CartPickupRequestCollection',
        reverseRelation: {
          key: 'cart',
          type: Backbone.HasOne
        }
      }, {
        type: Backbone.HasMany,
        key: 'shipping_requests',
        relatedModel: 'CartShippingRequest',
        collectionType: 'CartPickupRequestCollection',
        reverseRelation: {
          key: 'cart',
          type: Backbone.HasOne
        }
      }, {
        type: Backbone.HasMany,
        key: 'pickup_requests',
        relatedModel: 'CartPickupRequest',
        collectionType: 'CartPickupRequestCollection',
        reverseRelation: {
          key: 'cart',
          type: Backbone.HasOne
        }
      }
    ],
    url: function() {
      return "" + SOCIAL_CART_API_URL + "pickup_requests/" + (this.get('id')) + "/";
    }
  });

  window.ItemSocialBuy = Backbone.Model.extend({
    relations: [
      {
        type: Backbone.HasOne,
        key: 'item',
        relatedModel: 'Item'
      }, {
        type: Backbone.HasOne,
        key: 'creator',
        relatedModel: 'User',
        includeInJSON: true
      }
    ],
    url: function() {
      return "" + (this.get('item').get('resource_uri')) + "buys/" + (this.get('id')) + "/";
    }
  });

  _.extend(ItemSocialBuy.prototype, SocialBuyMixin);

  window.ItemSocialBuyCollection = Backbone.Collection.extend({
    model: ItemSocialBuy
  });

  window.ItemPersonalTag = Backbone.RelationalModel.extend({
    relations: [
      {
        type: Backbone.HasOne,
        key: 'item',
        relatedModel: 'Item'
      }
    ],
    url: function() {
      return "" + (this.get('item').get('resource_uri')) + "personal_tag/";
    }
  });

}).call(this);
