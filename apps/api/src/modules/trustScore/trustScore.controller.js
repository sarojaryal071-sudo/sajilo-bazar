import * as trustScoreService from './trustScore.service.js';

export async function getMe(req, res, next) {
  try {
    const trustScore = await trustScoreService.getMyTrustScore(req.user.id);
    res.json({ trustScore });
  } catch (err) {
    next(err);
  }
}
