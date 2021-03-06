const createHttpError = require("http-errors");
const LearningPath = require("../../model/learningPath");
const { default: mongoose } = require("mongoose");
const { StoreThumbToDB } = require("../../service/uploadMedia");
const {SearchByName} = require("../../service/searchByName");

module.exports = {
  CreateLearningPath: async ({ body, files }) => {
    try {
      let { name, rating, courses } = body;
      rating = rating || 0;

      if(!courses || !name) {
        throw new createHttpError(400, "Courses and name is required!")
      }

      const coursesArr = courses.split(",");

      const resDB = await LearningPath.create({
        name,
        rating,
        courses: [...coursesArr],
      });

      if (files.thumb) {
        const thumbInfo = await StoreThumbToDB(
          LearningPath,
          resDB._id,
          files.thumb[0]
        );

        var thumbnail = thumbInfo;
      }
      
      return {
        message: "success",
        data: {
          'learning-path': resDB,
          thumbnail,
        }
      };
    } catch (error) {
      const errorStatus = error.statusCode || 500;
      throw new createHttpError(errorStatus, error.message);
    }
  },
  GetLearingPathById: async (id) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new createHttpError(404, "Learning path not found!");
      }
      let resDB = await LearningPath.findById(id);

      if (!resDB) {
        throw new createHttpError(404, "Learning path not found!");
      }
      //   console.log(courses);
      await resDB.populate("courses");

      return {
        message: "success",
        data: resDB,
      };
    } catch (error) {
      throw error;
    }
  },
  GetAllLearingPath: async ({ qPage, qSort, pageSize }) => {
    let learingPaths;
    let startIndex;
    try {
      if (qPage) {
        qPage = parseInt(qPage);
        qPage < 1 ? (qPage = 1) : qPage;
        startIndex = (qPage - 1) * pageSize;
      }
      if (qPage && !qSort) {
        learingPaths = await LearningPath.find()
          .skip(startIndex)
          .limit(pageSize);
      } else if (qPage && qSort) {
        if (qSort === "asc") {
          learingPaths = await LearningPath.find()
            .sort({ _id: 1 })
            .skip(startIndex)
            .limit(pageSize);
        } else if (qSort === "desc") {
          learingPaths = await LearningPath.find()
            .sort({ _id: -1 })
            .skip(startIndex)
            .limit(pageSize);
        }
      } else if (!qPage && qSort) {
        if (qSort === "asc") {
          learingPaths = await LearningPath.find().sort({ _id: 1 });
        } else if (qSort === "desc") {
          learingPaths = await LearningPath.find().sort({ _id: -1 });
        }
      } else {
        learingPaths = await LearningPath.find();
      }

      const fullLearingPath = await Promise.all(
        learingPaths.map((e) => {
          return e.populate("courses");
        })
      );

      console.log(fullLearingPath);
      return {
        learingPaths,
      };
    } catch (error) {
      throw new createHttpError(error);
    }
  },
  SearchByName: async (name) => {
    try {
      if (!name) {
        throw new createHttpError(400, "Learning path name is required!");
      }

      const resDB = await SearchByName(LearningPath, name);
      
      await Promise.all(resDB.map(e => {
        return e.populate('courses')
      }))

      return resDB;
    } catch (error) {
      throw new createHttpError(error.message || 500, error.message);
    }
  },
};
