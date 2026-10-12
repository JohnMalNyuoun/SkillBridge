import api from './api';

export const followTarget = (targetId, targetModel) => {
  return api.post(`/follow/${targetId}/${targetModel}`);
};

export const unfollowTarget = (targetId, targetModel) => {
  return api.delete(`/follow/${targetId}/${targetModel}`);
};

export const checkFollowStatus = (targetId, targetModel) => {
  return api.get(`/follow/status/${targetId}/${targetModel}`);
};

export const getFollowCount = (targetId, targetModel) => {
  return api.get(`/follow/count/${targetId}/${targetModel}`);
};

export const getFollowers = (targetId, targetModel, limit = 20, skip = 0) => {
  return api.get(`/follow/followers/${targetId}/${targetModel}`, {
    params: { limit, skip }
  });
};

export const getFollowing = (userId, limit = 20, skip = 0) => {
  return api.get(`/follow/following/${userId}`, {
    params: { limit, skip }
  });
};
