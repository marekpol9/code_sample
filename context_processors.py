from friends.models import FriendshipRequest


def friendship_requests_counter(request):
    if request.user.is_authenticated():
        return { 'friendship_requests_count': FriendshipRequest.objects.filter(
                                                      to_user=request.user,
                                                      accepted=False).count() }
    else:
        return {}
