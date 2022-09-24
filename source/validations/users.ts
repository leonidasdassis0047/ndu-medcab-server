import Joi from 'joi';

const signup = Joi.object({
  username: Joi.string().max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().max(13).required()
});

const signin = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export default { signup, signin };
