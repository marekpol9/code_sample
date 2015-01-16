from django.conf.urls.defaults import *
from friends import views

urlpatterns = patterns('',

    url(r'^search/$', views.SearchView.as_view(),
            name='friends.search'),

    url(r'^incoming_requests/$',
        views.IncomingFriendshipRequestsListView.as_view(),
        name='friends.view_incoming_requests'),

    url(r'^outcoming_requests/$',
        views.OutcomingFriendshipRequestsListView.as_view(),
        name='friends.view_outcoming_requests'),

    url(r'^list/$',
        views.FriendsListView.as_view(),
        name='friends.view_friends'),


    url(r'^add/(\d+)/$',
        views.RequestFriendshipView.as_view(),
        name='friends.friendship_request'),

    url(r'^accept/(\d+)/$',
        views.AcceptFriendshipView.as_view(),
        name='friends.friendship_accept'),

    url(r'^decline/(\d+)/$',
        views.DeclineFriendshipView.as_view(),
        name='friends.friendship_decline'),

    url(r'^cancel/(\d+)/$',
        views.CancelFriendshipView.as_view(),
        name='friends.friendship_cancel'),

    url(r'^delete/(\d+)/$',
        views.DeleteFriendshipView.as_view(),
        name='friends.friendship_delete'),

)
