class MediaController {
  static upload(req, res) {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File tidak ditemukan",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Upload berhasil",
      file: {
        filename: req.file.filename,
        path: `/uploads/articles/${req.file.filename}`,
      },
    });
  }
}

module.exports = MediaController;
