export const validateSchema = (schema) => (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      return res.status(400).json({
        error: err.errors.map(e => e.message)
      });
    }
  };
  