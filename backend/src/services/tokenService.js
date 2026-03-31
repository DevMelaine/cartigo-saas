const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const generateAccessToken = require("../utils/generateAccessToken");
const {
  generateRefreshTokenString,
  getRefreshTokenExpiryDate,
} = require("../utils/generateRefreshToken");

// reuse global prisma if created by jest.setup
const prisma = global.prisma || new PrismaClient();

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function createTokenPairForUser(user) {
  const payload = {
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role,
  };

  const accessToken = generateAccessToken(payload);

  const refreshTokenPlain = generateRefreshTokenString();
  const refreshTokenHash = hashToken(refreshTokenPlain);
  const expiresAt = getRefreshTokenExpiryDate();

  await prisma.refreshToken.create({
    data: {
      tokenHash: refreshTokenHash,
      userId: user.id,
      expiresAt,
    },
  });

  return {
    accessToken,
    refreshToken: refreshTokenPlain,
  };
}

async function rotateRefreshToken(oldRefreshToken) {
  const refreshTokenHash = hashToken(oldRefreshToken);

  const existing = await prisma.refreshToken.findFirst({
    where: {
      tokenHash: refreshTokenHash,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: true,
    },
  });

  if (!existing || !existing.user) {
    const error = new Error("Invalid refresh token");
    error.statusCode = 401;
    throw error;
  }

  // Invalidate old token
  await prisma.refreshToken.delete({
    where: { id: existing.id },
  });

  const tokenPair = await createTokenPairForUser(existing.user);

  return {
    user: existing.user,
    ...tokenPair,
  };
}

module.exports = {
  createTokenPairForUser,
  rotateRefreshToken,
};

