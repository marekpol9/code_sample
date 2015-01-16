(function() {

  window.PersonalCartRouter = Backbone.Router.extend({
    routes: {
      '': 'start',
      '!/': 'start'
    },
    start: function() {},
    initialize: function(options) {
      return new CartBuysView({
        collection: new CartPersonalBuyCollection(options.cart.buys),
        el: $('.buys'),
        cartType: 'personal',
        checkoutButtonEl: $('.checkout.btn'),
        buyTemplate: getTemplate('personal-buy-template'),
        tagTemplate: getTemplate('personal-tag-template')
      });
    }
  });

  window.SocialCartRouter = Backbone.Router.extend({
    routes: {
      '': 'start',
      '!/': 'start'
    },
    start: function() {},
    initialize: function(options) {
      return new CartView({
        el: $('#cart'),
        model: new SocialCart(options.cart),
        cartType: 'social',
        buyTemplate: getTemplate('social-buy-template'),
        tagTemplate: getTemplate('social-tag-template'),
        checkoutButtonEl: $('.checkout.btn'),
        shippingModalEl: $('#shipping-modal')
      });
    }
  });

}).call(this);
