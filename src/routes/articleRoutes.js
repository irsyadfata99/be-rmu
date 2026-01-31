const express = require("express");
const router = express.Router();
const ArticleController = require("../controllers/ArticleController");
const { authenticate, authorize } = require("../middlewares/auth");
const uploadArticle = require("../middlewares/uploadArticleImage");

// GET ALL
router.get(
  "/",
  authenticate,
  authorize(["ADMIN"]),
  ArticleController.getAll
);

// GET WHERE PUBLISH
router.get(
  "/publish",
  ArticleController.getPublish
);

// GET BY ID
router.get(
  "/:id",
  ArticleController.getById
);

// CREATE (🔥 WAJIB ADA MULTER 🔥)
router.post(
  "/",
  authenticate,
  authorize(["ADMIN"]),
  uploadArticle.single("thumbImage"),
  ArticleController.create
);

router.put(
  "/:id",
  authenticate,
  authorize(["ADMIN"]),
  uploadArticle.single("thumbImage"),
  ArticleController.update
);

// DELETE
router.delete(
  "/:id",
  authenticate,
  authorize(["ADMIN"]),
  ArticleController.delete
);

// PUBLISH
router.patch(
  "/publish/:id",
  authenticate,
  authorize(["ADMIN"]),
  ArticleController.publishArticle
);

module.exports = router;
