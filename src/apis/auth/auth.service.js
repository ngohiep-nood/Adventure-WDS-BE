const createHttpError = require("http-errors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../../model/user");
const user = require("../../model/user");


const updateRefreshToken = async (userId, refreshToken) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: userId },
      { $set: { refreshToken: refreshToken } }
    );
  } catch (error) {
    throw new createHttpError(500, error.message);
  }
};

module.exports = {
  Register: async (body) => {
    const { username, password } = body;
    if (!username || !password) {
      throw new createHttpError(400, "username or password is empty!");
    }
    try {
      const user = await User.findOne({ username });

      if (user) {
        throw new createHttpError(400, "User already exist!");
      }

      const salt = await bcrypt.genSalt(10);
      const hashPassword = await bcrypt.hash(password, salt);

      const responseDB = await User.create({
        username,
        password: hashPassword,
      });

      const accessToken = jwt.sign(
        { userId: responseDB._id, username, role: responseDB.role },
        process.env.JWT_SECRET,
        {
          expiresIn: "1h",
        }
      );
      const refreshToken = jwt.sign(
        { userId: responseDB._id, username, role: responseDB.role },
        process.env.JWT_SECRET,
        {
          expiresIn: "5h",
        }
      );
      await updateRefreshToken(responseDB._id, refreshToken);
      return {
        statusCode: 201,
        message: "Create user success!",
        token: {
          accessToken,
          refreshToken,
        },
      };
    } catch (error) {
      if (error) {
        throw error;
      }
      throw new createHttpError(500, "Cannot create User");
    }
  },
  Login: async ({ username, password: plainPassword }) => {
    try {
      let filterUser = await User.findOne({ username }).select("+password");
      if (filterUser) {
        if (await bcrypt.compare(plainPassword, filterUser.password)) {
          const accessToken = jwt.sign(
            {
              userId: filterUser._id,
              username: filterUser.username,
              role: filterUser.role,
            },
            process.env.JWT_SECRET,
            {
              expiresIn: "1h",
            }
          );
          const refreshToken = jwt.sign(
            {
              userId: filterUser._id,
              username: filterUser.username,
              role: filterUser.role,
            },
            process.env.JWT_SECRET,
            {
              expiresIn: "5h",
            }
          );
          await updateRefreshToken(filterUser._id, refreshToken);
          return {
            error: false,
            msg: "Login success",
            token: {
              accessToken,
              refreshToken,
            },
          };
        } else {
          throw new createHttpError(401, "Wrong Password");
        }
      } else {
        throw new createHttpError(404, "User not found");
      }
    } catch (error) {
      if (error) throw error;
      throw new createHttpError(500, "Internal Error!");
    }
  },
  GetToken: async (userId) => {
    try {
      const user = await User.findById(userId)

      const accessToken = jwt.sign(
        {
          userId: user._id,
          username: user.username,
          role: user.role,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "1h",
        }
      );

      const refreshToken = jwt.sign(
        {
          userId: user._id,
          role: user.role,
          username: user.username,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "5h",
        }
      );

      await updateRefreshToken(userId, refreshToken);
      return {
        accessToken,
        refreshToken,
      };
    } catch (error) {
      throw new createHttpError(error);
    }
  },
  Logout: async (body) => {
    try {
      const userId = body.userInfo.userId;
      const user = await User.findOne({ _id: userId });
      await updateRefreshToken(user._id, null);
      return {
        statusCode: 200,
        message: "Logout success",
      };
    } catch (error) {
      throw new createHttpError(500, error.message);
    }
  },
};
