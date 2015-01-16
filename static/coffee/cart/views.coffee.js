(function() {

  window.CartTagView = Backbone.View.extend({
    tagName: 'li',
    initialize: function(options) {
      this.el = $(this.el);
      this._template = options.template;
      this._cartType = options.cartType;
      if (this._cartType === 'social') {
        this._cartUrl = SOCIAL_CART_API_URL;
      } else if (this._cartType === 'personal') {
        this._cartUrl = PERSONAL_CART_API_URL;
      }
      return this.constructor.__super__.initialize.apply(this, arguments);
    },
    events: {
      'click .change': '_activate',
      'click .remove': '_remove',
      'submit form': '_postForm'
    },
    _activate: function() {
      return this.el.addClass('active');
    },
    _postForm: function() {
      var quantity, request,
        _this = this;
      this.el.removeClass('active').addClass('loading');
      quantity = this.$('[name=quantity]').val();
      request = {
        buys: [
          {
            id: this.model.get('buy').get('id'),
            tags: [
              {
                quantity: quantity,
                item: this.model.get('item')
              }
            ]
          }
        ]
      };
      $.ajax({
        type: 'POST',
        url: this._cartUrl,
        data: $.stringify(request),
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        success: function() {
          return _this.model.get('buy').fetch({
            success: function() {
              return _this.el.removeClass('loading');
            }
          });
        }
      });
      return false;
    },
    _remove: function() {
      var request,
        _this = this;
      request = {
        buys: [
          {
            id: this.model.get('buy').get('id'),
            tags: [
              {
                quantity: 0,
                item: this.model.get('item')
              }
            ]
          }
        ]
      };
      $.ajax({
        type: 'POST',
        url: this._cartUrl,
        data: $.stringify(request),
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        success: function() {
          var buy;
          buy = _this.model.get('buy');
          return buy.fetch({
            success: function() {
              if (buy.get('tags').length === 0) buy.collection.remove(buy);
              return _this.el.removeClass('loading');
            },
            error: function() {
              return buy.collection.remove(buy);
            }
          });
        }
      });
      return this;
    },
    render: function() {
      var buy;
      this.el.html(this._template(this.model.toJSON()));
      this.$('.money').formatMoney();
      buy = this.model.get('buy');
      if (buy.has('shipping_request') || buy.has('pickup_request')) {
        this.el.addClass('uneditable');
      }
      return this;
    }
  });

  window.CartTagsView = CollectionView.extend({
    tagName: 'ul',
    className: 'tags unstyled',
    initialize: function(options) {
      this._template = options.template;
      this._cartType = options.cartType;
      return this.constructor.__super__.initialize.apply(this, arguments);
    },
    _constructView: function(tag) {
      return new CartTagView({
        model: tag,
        cartType: this._cartType,
        template: this._template
      });
    },
    _onAdd: function(view) {
      return this.el.append(view.render().el);
    }
  });

  window.CartBuyView = Backbone.View.extend({
    tagName: 'li',
    initialize: function(options) {
      this.el = $(this.el);
      this._buyTemplate = options.buyTemplate;
      this._shippingModalEl = options.shippingModalEl;
      this._tagsView = new CartTagsView({
        collection: this.model.get('tags'),
        template: options.tagTemplate,
        cartType: options.cartType
      });
      return this.constructor.__super__.initialize.apply(this, arguments);
    },
    events: {
      'click .shipping button.select': '_showShippingModal'
    },
    _showShippingModal: function(type) {
      var cancelButton, modalEl, selectButton,
        _this = this;
      modalEl = this._shippingModalEl.modal('show');
      cancelButton = modalEl.find('.btn.cancel');
      cancelButton.click(function() {
        return modalEl.modal('hide');
      });
      selectButton = modalEl.find('.btn.select');
      selectButton.click(function() {
        var address, selectedShipping;
        selectedShipping = modalEl.find('input[name=shipping]:checked').val();
        address = modalEl.find('.shipping-address textarea').val();
        return _this._sentRequest(selectedShipping, address);
      });
      return modalEl.one('hidden', function() {
        cancelButton.unbind('click');
        return selectButton.unbind('click');
      });
    },
    _sentRequest: function(requestType, address) {
      var request, url,
        _this = this;
      if (requestType === 'shipping') {
        request = {
          address: address
        };
        url = "" + (this.model.url()) + "shipping_request/";
      } else if (requestType === 'pickup') {
        request = {};
        url = "" + (this.model.url()) + "pickup_request/";
      }
      this._shippingModalEl.addClass('loading');
      $.ajax({
        type: 'POST',
        url: url,
        data: $.stringify(request),
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        success: function(requestData) {
          var requests;
          if (requestType === 'shipping') {
            requests = _this.model.get('cart').get('pending_shipping_requests');
            request = new CartShippingRequest(requestData);
          } else if (requestType === 'pickup') {
            requests = _this.model.get('cart').get('pickup_requests');
            request = new CartPickupRequest(requestData);
          }
          return request.fetch({
            success: function() {
              return _this.model.fetch({
                success: function() {
                  requests.add(request);
                  if (_this.model.get('tags').length === 0) {
                    _this.model.collection.remove(_this.model);
                    return _this._shippingModalEl.removeClass('loading').modal('hide');
                  }
                }
              });
            }
          });
        }
      });
      return this;
    },
    render: function(template) {
      var context;
      context = this.model.toJSON();
      _.extend(context, {
        hasShippingRequest: this.model.has('shipping_request'),
        hasPickupRequest: this.model.has('pickup_request')
      });
      this.el.html(this._buyTemplate(context));
      this.el.find('.tags').replaceWith(this._tagsView.el);
      if (this.model.isExpired()) this.el.addClass('expired');
      return this;
    }
  });

  window.CartBuysView = CollectionView.extend({
    initialize: function(options) {
      this._tagTemplate = options.tagTemplate;
      this._buyTemplate = options.buyTemplate;
      this._cartType = options.cartType;
      this._shippingModalEl = options.shippingModalEl;
      return this.constructor.__super__.initialize.apply(this, arguments);
    },
    _constructView: function(buy) {
      return new CartBuyView({
        model: buy,
        buyTemplate: this._buyTemplate,
        tagTemplate: this._tagTemplate,
        cartType: this._cartType,
        shippingModalEl: this._shippingModalEl
      });
    },
    _onAdd: function(view) {
      return this.el.append(view.render().el);
    }
  });

  window.CartRequestView = Backbone.View.extend({
    tagName: 'li',
    initialize: function(options) {
      this.el = $(this.el);
      return this._buyView = new CartBuyView({
        el: this.el,
        model: options.model.get('buy'),
        buyTemplate: options.buyTemplate,
        tagTemplate: options.tagTemplate,
        cartType: options.cartType
      });
    },
    events: {
      'click .shipping .cancel': '_remove'
    },
    _remove: function() {
      var buy, cartBuys, collection,
        _this = this;
      if (!window.confirm('Are you sure?')) return;
      buy = this.model.get('buy');
      cartBuys = this.model.get('cart').get('buys');
      this.el.addClass('loading');
      collection = this.model.collection;
      collection.remove(this.model, {
        silent: true
      });
      return this.model.destroy({
        success: function() {
          var draftBuy;
          draftBuy = cartBuys.getByAttr('id', buy.get('id'));
          if (draftBuy) {
            return draftBuy.fetch({
              success: function() {
                collection.trigger('remove', _this.model);
                return _this.el.removeClass('loading');
              }
            });
          } else {
            draftBuy = new CartSocialBuy({
              id: buy.get('id')
            });
            return draftBuy.fetch({
              success: function() {
                cartBuys.add(draftBuy);
                collection.trigger('remove', _this.model);
                return _this.el.removeClass('loading');
              }
            });
          }
        }
      });
    },
    render: function(template) {
      this._buyView.render();
      return this;
    }
  });

  window.CartRequestsView = CollectionView.extend({
    initialize: function(options) {
      this._buyTemplate = options.buyTemplate;
      this._tagTemplate = options.tagTemplate;
      this._cartType = options.cartType;
      return this.constructor.__super__.initialize.apply(this, arguments);
    },
    _constructView: function(shippingRequest) {
      return new CartRequestView({
        model: shippingRequest,
        buyTemplate: this._buyTemplate,
        tagTemplate: this._tagTemplate,
        cartType: this._cartType
      });
    },
    _onAdd: function(view) {
      return this.el.append(view.render().el);
    }
  });

  window.CartView = Backbone.View.extend({
    initialize: function(options) {
      var commonOptions, handler, modalEl,
        _this = this;
      this.el = $(this.el);
      commonOptions = {
        cartType: options.cartType,
        buyTemplate: options.buyTemplate,
        tagTemplate: options.tagTemplate
      };
      modalEl = $(options.shippingModalEl).modal({
        backdrop: true
      });
      modalEl.find('input[name=shipping]').change(function() {
        modalEl.find('input[type=submit]').removeAttr('disabled');
        if (modalEl.find('input[name=shipping]:checked').val() === 'shipping') {
          return modalEl.find('.shipping-address').show();
        } else {
          return modalEl.find('.shipping-address').hide();
        }
      });
      modalEl.find('input[type=submit]').attr('disabled', 'disabled');
      modalEl.on('hidden', function() {
        modalEl.find('input[name=shipping]').attr('checked', false);
        modalEl.find('input[type=submit]').attr('disabled', 'disabled');
        return modalEl.find('.shipping-address').hide();
      });
      new CartBuysView(_.extend({}, commonOptions, {
        collection: this.model.get('buys'),
        el: this.$('.buys.draft'),
        checkoutButtonEl: options.checkoutButtonEl,
        shippingModalEl: modalEl
      }));
      new CartRequestsView(_.extend({}, commonOptions, {
        collection: this.model.get('pending_shipping_requests'),
        el: this.$('.buys.pending-shipping-requests')
      }));
      new CartRequestsView(_.extend({}, commonOptions, {
        collection: this.model.get('shipping_requests'),
        el: this.$('.buys.shipping-requests')
      }));
      new CartRequestsView(_.extend({}, commonOptions, {
        collection: this.model.get('pickup_requests'),
        el: this.$('.buys.pickup-requests')
      }));
      handler = function(event) {
        if (event === 'add' || event === 'remove' || event === 'reset') {
          return _this._updateSections();
        }
      };
      this.model.get('buys').bind('all', handler);
      this.model.get('pending_shipping_requests').bind('all', handler);
      this.model.get('shipping_requests').bind('all', handler);
      this.model.get('pickup_requests').bind('all', handler);
      this._checkoutButtonEl = $(options.checkoutButtonEl).click(function() {
        if (_this.$('.loading').length > 0 || _this._checkoutButtonEl.hasClass('disabled')) {
          return false;
        }
      });
      return this._updateSections();
    },
    _updateSections: function() {
      if (this.model.get('buys').length === 0 && this.model.get('pending_shipping_requests').length === 0) {
        $('.section-1').addClass('empty');
      } else {
        $('.section-1').removeClass('empty');
      }
      if (this.model.get('shipping_requests').length === 0 && this.model.get('pickup_requests').length === 0) {
        $('.section-2').addClass('empty');
        return this._checkoutButtonEl.addClass('disabled');
      } else {
        $('.section-2').removeClass('empty');
        return this._checkoutButtonEl.removeClass('disabled');
      }
    }
  });

  window.ItemSocialBuyView = Backbone.View.extend({
    tagName: 'li',
    initialize: function(options) {
      var _this = this;
      this.el = $(this.el);
      this._template = options.template;
      this.model.bind('change', function() {
        return _this.render;
      });
      return this.el.hover(function() {
        return _this.el.addClass('hover');
      }, function() {
        return _this.el.removeClass('hover');
      });
    },
    events: {
      'click .join': '_activate',
      'submit form': '_postForm'
    },
    _activate: function() {
      return this.el.addClass('active');
    },
    _postForm: function() {
      var quantity, request,
        _this = this;
      this.el.removeClass('active').addClass('loading');
      quantity = this.$('[name=quantity]').val();
      request = {
        buys: [
          {
            id: this.model.get('id'),
            tags: [
              {
                quantity: quantity,
                item: this.model.get('item').get('resource_uri')
              }
            ]
          }
        ]
      };
      $.ajax({
        type: 'POST',
        url: SOCIAL_CART_API_URL,
        data: $.stringify(request),
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        success: function() {
          return _this.model.fetch({
            success: function() {
              return _this.el.removeClass('loading');
            }
          });
        }
      });
      return false;
    },
    render: function() {
      var context;
      context = this.model.toJSON();
      this.el.html(this._template(context)).find('.money').formatMoney();
      if (this.model.get('tag')) this.el.addClass('in-cart');
      if (!this.model.get('is_active')) this.el.addClass('inactive');
      return this;
    }
  });

  window.ItemSocialBuysView = CollectionView.extend({
    initialize: function(options) {
      var _this = this;
      this._createFormEl = $(options.createFormEl);
      this._datetimePicker = new DateTimePicker({
        el: this._createFormEl.find('.datetimepicker'),
        initial: moment().add({
          hours: 1
        })
      });
      this._createFormModalEl = $(options.createFormModalEl);
      this._template = options.template;
      this._buyTemplate = options.buyTemplate;
      this._item = options.item;
      this.render();
      this.constructor.__super__.initialize.apply(this, arguments);
      return this._createFormEl.submit(function() {
        return _this._createBuy();
      });
    },
    _createBuy: function(e) {
      var finishDate, quantity, request,
        _this = this;
      finishDate = this._datetimePicker.getCurrentDatetime({
        inUTC: true
      });
      quantity = this._createFormEl.find('[name=quantity]').val();
      request = {
        buys: [
          {
            finish_date: finishDate,
            store: this._item.get('store'),
            tags: [
              {
                quantity: quantity,
                item: this._item.get('resource_uri')
              }
            ]
          }
        ]
      };
      this._createFormModalEl.addClass('loading');
      $.ajax({
        type: 'POST',
        url: SOCIAL_CART_API_URL,
        data: $.stringify(request),
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        success: function(data) {
          var buy, id;
          id = data.buys[0].id;
          buy = new ItemSocialBuy({
            id: id,
            item: _this._item
          });
          return buy.fetch({
            success: function() {
              _this.collection.add(buy);
              return _this._createFormModalEl.removeClass('loading').modal('hide');
            }
          });
        }
      });
      return false;
    },
    _constructView: function(buy) {
      return new ItemSocialBuyView({
        model: buy,
        template: this._buyTemplate
      });
    },
    _onAdd: function(view) {
      var viewEl;
      if (this.collection.length === 1) this.render();
      viewEl = $(view.render().el);
      if (viewEl.hasClass('inactive')) {
        viewEl.prependTo(this.el.find('.buys'));
        return $('.activate-your-buys').show();
      } else {
        return viewEl.appendTo(this.el.find('.buys'));
      }
    },
    render: function() {
      var newEl;
      newEl = $(this._template({
        is_empty: this.collection.length === 0
      }));
      this.el = this.el.replaceWith(newEl);
      this.el = newEl;
      return this;
    }
  });

  window.ItemPersonalTagView = Backbone.View.extend({
    initialize: function(options) {
      this.el = $(this.el);
      this._template = options.template;
      this._item = options.item;
      return this.render();
    },
    events: {
      'click .buy-immediately': '_activate',
      'submit form': '_postForm'
    },
    _activate: function() {
      return this.el.addClass('active');
    },
    _postForm: function() {
      var quantity, request,
        _this = this;
      quantity = this.el.find('[name=quantity]').val();
      request = {
        buys: [
          {
            id: this._item.get('store'),
            tags: [
              {
                quantity: quantity,
                item: this._item.get('resource_uri')
              }
            ]
          }
        ]
      };
      this.el.removeClass('active').addClass('loading');
      $.ajax({
        type: 'POST',
        url: PERSONAL_CART_API_URL,
        data: $.stringify(request),
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        success: function() {
          _this.model = new ItemPersonalTag({
            item: _this._item
          });
          return _this.model.fetch({
            success: function() {
              return _this.render();
            }
          });
        }
      });
      return false;
    },
    render: function() {
      if (this.model != null) {
        this.el.html("" + (this.model.get('quantity')) + " in cart");
      }
      return this;
    }
  });

}).call(this);
