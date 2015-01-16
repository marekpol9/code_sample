from django.db import transaction
from django.db.models import Q
from django.http import HttpResponse, Http404
from django.views.generic.base import View
from django.views.generic import ListView
from django.views.generic.edit import BaseFormView
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.utils.translation import ugettext_lazy as _

from friends.models import FriendshipRequest, Friendship
from friends.forms import SearchForm
from utils import render_to_json, LoginRequiredMixin


class SearchView(ListView, BaseFormView): # ListView must go first
    form_class = SearchForm
    context_object_name = 'user_list'
    template_name = 'friends/search.j.html'

    def get_queryset(self):
        if hasattr(self, 'query'):
            return User.objects.filter(
                    Q(first_name__icontains=self.query) | \
                    Q(last_name__icontains=self.query))

    def get_context_data(self, **kwargs):
        context = super(SearchView, self).get_context_data(**kwargs)
        context['form'] = self.get_form(self.get_form_class())
        return context

    def form_valid(self, form):
        self.query = form.cleaned_data['query']
        return self.get(self.request, *self.args, **self.kwargs)

    def form_invalid(self, form):
        return self.get(self.request, *self.args, **self.kwargs)


class IncomingFriendshipRequestsListView(LoginRequiredMixin, ListView):
    context_object_name = 'friendship_requests'
    template_name = 'friends/incoming_requests.j.html'

    def get_queryset(self):
        return FriendshipRequest.objects.filter(
                                to_user=self.request.user,
                                accepted=False)


class OutcomingFriendshipRequestsListView(LoginRequiredMixin, ListView):
    context_object_name = 'friendship_requests'
    template_name = 'friends/outcoming_requests.j.html'

    def get_queryset(self):
        return FriendshipRequest.objects.filter(
                                from_user=self.request.user,
                                accepted=False)


class FriendsListView(LoginRequiredMixin, ListView):
    context_object_name = 'friends'
    template_name = 'friends/friends.j.html'

    def get_queryset(self):
        return Friendship.objects.friends_of(self.request.user)


class FriendshipViewBase(View):
    @method_decorator(login_required)
    def get(self, request, id, *args, **kwargs):
        other_user_id = int(id)
        if request.user.id == other_user_id:
            raise Http404
        other_user = get_object_or_404(User, pk=other_user_id)

        context = self.process(request.user, other_user) # TODO handle 404 exceptions?
        return render_to_json(context)

    def process(self, user, other_user):
        raise NotImplementedError


class RequestFriendshipView(FriendshipViewBase):
    @method_decorator(transaction.commit_on_success)
    def process(self, user, other_user):
        if Friendship.objects.are_friends(user, other_user):
            message = _('You are already friends with %s')
        elif FriendshipRequest.objects.filter(from_user=other_user,
                                              to_user=user).exists():
            FriendshipRequest.objects.get(from_user=other_user,
                                          to_user=user).accept()
            message = _('You are now friends with %s.')
        else:
            if FriendshipRequest.objects.filter(from_user=user,
                                                to_user=other_user).exists():
                message = _('You already have an active friend invitation for %s.')
            else:
                FriendshipRequest.objects.create(from_user=user, to_user=other_user)
                message = _('You have requested to be friends with %s.')
        return { 'message': message % other_user.get_full_name() }


class AcceptFriendshipView(FriendshipViewBase):
    def process(self, user, other_user):
        if Friendship.objects.are_friends(user, other_user):
            message = _('You are already friends with %s')
        else:
            get_object_or_404(FriendshipRequest,
                              from_user=other_user,
                              to_user=user).accept()
            message = _('You are now friends with %s.')
        return { 'message': message % other_user.get_full_name() }

        
class DeclineFriendshipView(FriendshipViewBase):
    def process(self, user, other_user):
        if Friendship.objects.are_friends(user, other_user):
            message = _('You are already friends with %s')
        else:
            get_object_or_404(FriendshipRequest,
                              from_user=other_user,
                              to_user=user).decline()
            message = _('You declined friendship request of %s.')
        return { 'message': message % other_user.get_full_name() }


class CancelFriendshipView(FriendshipViewBase):
    def process(self, user, other_user):
        if Friendship.objects.are_friends(user, other_user):
            message = _('You are already friends with %s')
        else:
            get_object_or_404(FriendshipRequest,
                              from_user=user,
                              to_user=other_user).cancel()
            message = _('You cancelled your request to be friends with %s.')
        return { 'message': message % other_user.get_full_name() }


class DeleteFriendshipView(FriendshipViewBase):
    def process(self, user, other_user):
        if Friendship.objects.are_friends(user, other_user):
            Friendship.objects.unfriend(user, other_user)
            message = _('You are no longer friends with %s.')
        else:
            message = _('You are not friends with %s')
        return { 'message': message % other_user.get_full_name() }
