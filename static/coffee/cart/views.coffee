# @class
# @param {_.template} template  compiled Underscore.js template.
# @param {string} cartType  'social' or 'personal'.
window.CartTagView = Backbone.View.extend
    tagName: 'li'

    initialize: (options) ->
        @el = $(@el)
        @_template = options.template
        @_cartType = options.cartType
        
        if @_cartType == 'social'
            @_cartUrl = SOCIAL_CART_API_URL
        else if @_cartType == 'personal'
            @_cartUrl = PERSONAL_CART_API_URL

        @.constructor.__super__.initialize.apply(@, arguments)
    
    events:
        'click .change': '_activate'
        'click .remove': '_remove'
        'submit form': '_postForm'

    _activate: ->
        @el.addClass('active')

    _postForm: ->
        @el.removeClass('active').addClass('loading')
        quantity = this.$('[name=quantity]').val()
        request = {
            buys: [{
                id: @model.get('buy').get('id')
                tags: [{
                    quantity: quantity
                    item: @model.get('item')
                }]
            }]
        }

        $.ajax(
            type: 'POST'
            url: @_cartUrl
            data: $.stringify(request)
            dataType: 'json'
            contentType: 'application/json; charset=utf-8'

            success: =>
                @model.get('buy').fetch success: =>
                    @el.removeClass('loading')
        )

        return false

    _remove: ->
        request = {
            buys: [{
                id: @model.get('buy').get('id')
                tags: [{
                    quantity: 0
                    item: @model.get('item')
                }]
            }]
        }

        $.ajax(
            type: 'POST'
            url: @_cartUrl
            data: $.stringify(request)
            dataType: 'json'
            contentType: 'application/json; charset=utf-8'

            success: =>
                buy = @model.get('buy')

                buy.fetch(
                    success: =>
                        if buy.get('tags').length is 0
                            buy.collection.remove(buy)
                        @el.removeClass('loading')
                    error: =>
                        buy.collection.remove(buy)
                )
        )

        return @

    render: ->
        @el.html(@_template(@model.toJSON()))
        @$('.money').formatMoney()

        buy = @model.get('buy')
        if buy.has('shipping_request') or buy.has('pickup_request')
            @el.addClass('uneditable')
        return @


# @class
# @param {_.template} template  compiled Underscore.js template.
# @param {string} cartType  'social' or 'personal'.
window.CartTagsView = CollectionView.extend
    tagName: 'ul'
    className: 'tags unstyled'

    initialize: (options) ->
        @_template = options.template
        @_cartType = options.cartType
        @.constructor.__super__.initialize.apply(@, arguments)

    _constructView: (tag) ->
        return new CartTagView
            model: tag
            cartType: @_cartType
            template: @_template

    _onAdd: (view) ->
        @.el.append(view.render().el)


# @class
# @param {_.template} buyTemplate  compiled Underscore.js template.
# @param {_.template} tagTemplate  compiled Underscore.js template.
window.CartBuyView = Backbone.View.extend
    tagName: 'li'

    initialize: (options) ->
        @el = $(@el)
        @_buyTemplate = options.buyTemplate
        @_shippingModalEl = options.shippingModalEl
        
        @_tagsView = new CartTagsView
            collection: @model.get('tags')
            template: options.tagTemplate
            cartType: options.cartType

        @.constructor.__super__.initialize.apply(@, arguments)

    events:
        'click .shipping button.select': '_showShippingModal'
    
    _showShippingModal: (type) ->
        modalEl = @_shippingModalEl.modal('show')

        cancelButton = modalEl.find('.btn.cancel')
        cancelButton.click -> modalEl.modal('hide')

        selectButton = modalEl.find('.btn.select')
        selectButton.click =>
            selectedShipping = modalEl.find('input[name=shipping]:checked').val()
            address = modalEl.find('.shipping-address textarea').val()
            @._sentRequest(selectedShipping, address)

        modalEl.one('hidden', ->
            cancelButton.unbind('click')
            selectButton.unbind('click')
        )

    _sentRequest: (requestType, address) ->
        if requestType == 'shipping'
            request = { address: address }
            url = "#{ @model.url() }shipping_request/"
        else if requestType == 'pickup'
            request = {}
            url = "#{ @model.url() }pickup_request/"
        
        @_shippingModalEl.addClass('loading')
        $.ajax(
            type: 'POST'
            url: url
            data: $.stringify(request)
            dataType: 'json'
            contentType: 'application/json; charset=utf-8'

            success: (requestData) =>
                if requestType == 'shipping'
                    requests = @model.get('cart').get('pending_shipping_requests')
                    request = new CartShippingRequest(requestData)
                else if requestType == 'pickup'
                    requests = @model.get('cart').get('pickup_requests')
                    request = new CartPickupRequest(requestData)
                
                request.fetch success: =>
                    @model.fetch success: =>
                        requests.add(request)
                        if @model.get('tags').length is 0
                            @model.collection.remove(@model)
                            @_shippingModalEl.removeClass('loading').modal('hide')
        )

        return @

    render: (template) ->
        context = @model.toJSON()
        _.extend(context,
            hasShippingRequest: @model.has('shipping_request')
            hasPickupRequest: @model.has('pickup_request')
        )
        @el.html(@_buyTemplate(context))
        @el.find('.tags').replaceWith(@_tagsView.el)
        if @model.isExpired() then @el.addClass('expired')
        return @


# @class
# @param {_.template} buyTemplate  compiled Underscore.js template.
# @param {_.template} tagTemplate  compiled Underscore.js template.
# @param {string} cartType  'social' or 'personal'.
# @param {string|$} checkoutButtonEl  checkout button.
window.CartBuysView = CollectionView.extend

    initialize: (options) ->
        @_tagTemplate = options.tagTemplate
        @_buyTemplate = options.buyTemplate
        @_cartType = options.cartType
        @_shippingModalEl = options.shippingModalEl

        @.constructor.__super__.initialize.apply(@, arguments)

    
    _constructView: (buy) ->
        return new CartBuyView
            model: buy
            buyTemplate: @_buyTemplate
            tagTemplate: @_tagTemplate
            cartType: @_cartType
            shippingModalEl: @_shippingModalEl

    _onAdd: (view) ->
        @el.append(view.render().el)


# @class
# @param {_.template} buyTemplate  compiled Underscore.js template.
# @param {_.template} tagTemplate  compiled Underscore.js template.
# @param {string} cartType  'social' or 'personal'.
window.CartRequestView = Backbone.View.extend
    tagName: 'li'

    initialize: (options) ->
        @el = $(@el)
        @_buyView = new CartBuyView
            el: @el
            model: options.model.get('buy')
            buyTemplate: options.buyTemplate
            tagTemplate: options.tagTemplate
            cartType: options.cartType

    events:
        'click .shipping .cancel': '_remove'

    _remove: ->
        if not window.confirm('Are you sure?')
            return

        buy = @model.get('buy')
        cartBuys = @model.get('cart').get('buys')
        
        # Delete request model
        @el.addClass('loading')
        
        collection = @model.collection
        collection.remove(@model, silent: true)
        @model.destroy(
            success: =>
                draftBuy = cartBuys.getByAttr('id', buy.get('id'))
                if draftBuy
                    # If request-related draft buy already exists,
                    # fetch it in order to get freed tags.
                    draftBuy.fetch success: =>
                        collection.trigger('remove', @model)
                        @el.removeClass('loading')
                else
                    # Otherwise create it manually, fetch and add to buys.
                    draftBuy = new CartSocialBuy(id: buy.get('id'))
                    draftBuy.fetch success: =>
                        cartBuys.add(draftBuy)
                        collection.trigger('remove', @model)
                        @el.removeClass('loading')
        )

    render: (template) ->
        @_buyView.render()
        return @


# @class
# @param {_.template} buyTemplate  compiled Underscore.js template.
# @param {_.template} tagTemplate  compiled Underscore.js template.
# @param {string} cartType  'social' or 'personal'.
window.CartRequestsView = CollectionView.extend

    initialize: (options) ->
        @_buyTemplate = options.buyTemplate
        @_tagTemplate = options.tagTemplate
        @_cartType = options.cartType

        @.constructor.__super__.initialize.apply(@, arguments)
    
    _constructView: (shippingRequest) ->
        return new CartRequestView
            model: shippingRequest
            buyTemplate: @_buyTemplate
            tagTemplate: @_tagTemplate
            cartType: @_cartType

    _onAdd: (view) ->
        @el.append(view.render().el)


# @class
# @param {_.template} buyTemplate  compiled Underscore.js template.
# @param {_.template} tagTemplate  compiled Underscore.js template.
# @param {string} cartType  'social' or 'personal'.
window.CartView = Backbone.View.extend

    initialize: (options) ->
        @el = $(@el)

        commonOptions =
            cartType: options.cartType
            buyTemplate: options.buyTemplate
            tagTemplate: options.tagTemplate

        modalEl = $(options.shippingModalEl).modal(backdrop: true)

        modalEl.find('input[name=shipping]').change ->
            modalEl.find('input[type=submit]').removeAttr('disabled')
            
            if modalEl.find('input[name=shipping]:checked').val() == 'shipping'
                modalEl.find('.shipping-address').show()
            else
                modalEl.find('.shipping-address').hide()
        modalEl.find('input[type=submit]').attr('disabled', 'disabled')
        
        modalEl.on('hidden', ->
            modalEl.find('input[name=shipping]').attr('checked', false)
            modalEl.find('input[type=submit]').attr('disabled', 'disabled')
            modalEl.find('.shipping-address').hide()
        )
        
        new CartBuysView _.extend({}, commonOptions,
            collection: @model.get('buys')
            el: @$('.buys.draft')
            checkoutButtonEl: options.checkoutButtonEl
            shippingModalEl: modalEl
        )

        new CartRequestsView _.extend({}, commonOptions,
            collection: @model.get('pending_shipping_requests')
            el: @$('.buys.pending-shipping-requests')
        )

        new CartRequestsView _.extend({}, commonOptions,
            collection: @model.get('shipping_requests')
            el: @$('.buys.shipping-requests')
        )

        new CartRequestsView _.extend({}, commonOptions,
            collection: @model.get('pickup_requests')
            el: @$('.buys.pickup-requests')
        )

        handler = (event) => if event in ['add', 'remove', 'reset'] then @_updateSections()
        @model.get('buys').bind('all', handler)
        @model.get('pending_shipping_requests').bind('all', handler)
        @model.get('shipping_requests').bind('all', handler)
        @model.get('pickup_requests').bind('all', handler)

        @_checkoutButtonEl = $(options.checkoutButtonEl).click =>
            if @$('.loading').length > 0 or @_checkoutButtonEl.hasClass('disabled')
                return false
        @_updateSections()

    _updateSections: ->
        if @model.get('buys').length is 0 and
           @model.get('pending_shipping_requests').length is 0
            $('.section-1').addClass('empty')
        else
            $('.section-1').removeClass('empty')

        if @model.get('shipping_requests').length is 0 and
           @model.get('pickup_requests').length is 0
            $('.section-2').addClass('empty')
            @_checkoutButtonEl.addClass('disabled')
        else
            $('.section-2').removeClass('empty')
            @_checkoutButtonEl.removeClass('disabled')


# @class
# @param {_.template} template  compiled Underscore.js template.
window.ItemSocialBuyView = Backbone.View.extend

    tagName: 'li'

    initialize: (options) ->
        @el = $(@el)
        @_template = options.template

        @model.bind('change', => @.render)
        @el.hover(
            => @el.addClass('hover'),
            => @el.removeClass('hover')
        )

    events:
        'click .join': '_activate'
        'submit form': '_postForm'

    _activate: ->
        @el.addClass('active')

    _postForm: ->
        @el.removeClass('active').addClass('loading')
        quantity = @$('[name=quantity]').val()
        request = {
            buys: [{
                id: @model.get('id')
                tags: [{
                    quantity: quantity
                    item: @model.get('item').get('resource_uri')
                }]
            }]
        }

        $.ajax(
            type: 'POST'
            url: SOCIAL_CART_API_URL
            data: $.stringify(request)
            dataType: 'json'
            contentType: 'application/json; charset=utf-8'

            success: => @model.fetch(success: => @el.removeClass('loading'))
        )

        return false

    render: ->
        context = @model.toJSON()
        @el.html(@_template(context)).find('.money').formatMoney();

        if @model.get('tag')
            @el.addClass('in-cart')

        if not @model.get('is_active')
            @el.addClass('inactive')

        return @


# @class
# @param {string|$} createFormEl  form with [name=finish_date] and [name=quantity] fields.
# @param {_.template} buyTemplate  compiled Underscore.js template.
# @param {_.template} template  compiled Underscore.js template.
# @param {Item} item  item through that these Social Buys are viewed.
window.ItemSocialBuysView = CollectionView.extend

    initialize: (options) ->
        @_createFormEl = $(options.createFormEl)
        @_datetimePicker = new DateTimePicker
            el: @_createFormEl.find('.datetimepicker')
            initial: moment().add(hours: 1)

        @_createFormModalEl = $(options.createFormModalEl)
        @_template = options.template
        @_buyTemplate = options.buyTemplate
        @_item = options.item

        @.render()
        @constructor.__super__.initialize.apply(@, arguments)
        @_createFormEl.submit => @_createBuy()

    _createBuy: (e) ->
        finishDate = @_datetimePicker.getCurrentDatetime(inUTC: true)
        quantity = @_createFormEl.find('[name=quantity]').val()

        request = {
            buys: [{
                finish_date: finishDate
                store: this._item.get('store')
                tags: [{
                    quantity: quantity
                    item: this._item.get('resource_uri')
                }]
            }]
        }

        @_createFormModalEl.addClass('loading')
        $.ajax(
            type: 'POST'
            url: SOCIAL_CART_API_URL
            data: $.stringify(request)
            dataType: 'json'
            contentType: 'application/json; charset=utf-8'

            success: (data) =>
                id = data.buys[0].id
                buy = new ItemSocialBuy
                    id: id
                    item: @_item

                buy.fetch(
                    success: =>
                        @collection.add(buy)
                        @_createFormModalEl.removeClass('loading').modal('hide')
                )
        )

        return false

    _constructView: (buy) ->
        return new ItemSocialBuyView
            model: buy
            template: @_buyTemplate

    _onAdd: (view) ->
        if @collection.length is 1 then @.render()
        viewEl = $(view.render().el)

        if viewEl.hasClass('inactive')
            viewEl.prependTo(@el.find('.buys'))
            $('.activate-your-buys').show()
        else
            viewEl.appendTo(@el.find('.buys'))

    render: ->
        newEl = $(@_template(is_empty: @collection.length == 0))
        @el = @el.replaceWith(newEl)
        @el = newEl
        return @



# @class
# @param {_.template} template  compiled Underscore.js template.
# @param {Item} item  item that contains (or will contain) this personal tag.
window.ItemPersonalTagView = Backbone.View.extend

    initialize: (options) ->
        @el = $(@el)
        @_template = options.template
        @_item = options.item
        @.render()

    events:
        'click .buy-immediately': '_activate'
        'submit form': '_postForm'

    _activate: ->
         @el.addClass('active')

    _postForm: ->
        quantity = @el.find('[name=quantity]').val()
        request = {
            buys: [{
                id: @_item.get('store')
                tags: [{
                    quantity: quantity
                    item: @_item.get('resource_uri')
                }]
            }]
        }

        @el.removeClass('active').addClass('loading')

        $.ajax(
            type: 'POST'
            url: PERSONAL_CART_API_URL
            data: $.stringify(request)
            dataType: 'json'
            contentType: 'application/json; charset=utf-8'

            success: =>
                @model = new ItemPersonalTag
                    item: @_item
                @model.fetch(success: => @.render())
        )

        return false

    render: ->
        if @model?
            @el.html("#{ @model.get('quantity') } in cart")
        return @
