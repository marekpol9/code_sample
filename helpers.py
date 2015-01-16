from friends.models import Friendship, FriendshipRequest


def get_friends_of(user):
    return Friendship.objects.friends_of(user)

def are_friends(user1, user2):
    return Friendship.objects.are_friends(user1, user2)

def is_invited(user, target_user):
    return FriendshipRequest.objects.filter(
                              from_user=user,
                              to_user=target_user,
                              accepted=False).exists()
