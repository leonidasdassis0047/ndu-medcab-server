import Joi from 'joi';

const createStore = Joi.object({
  name: Joi.string().max(50).required(),
  email: Joi.string().email().required()
});

export default { createStore };
