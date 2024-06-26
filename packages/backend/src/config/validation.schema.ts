import Joi from "joi";

export const validationSchema = Joi.object({
    NODE_ENV: Joi.string()
        .valid("development", "production", "test")
        .default("development"),

    PORT: Joi.number().port().default(3000),

    TW_DB_NAME: Joi.string().required(),

    TW_DB_HOST: Joi.string().required(),

    TW_DB_PORT: Joi.number().default(5432),

    TW_DB_USERNAME: Joi.string().required(),

    TW_DB_PASSWORD: Joi.string().required(),

    TW_DB_ENABLE_SSL: Joi.boolean().default(false),

    TW_SECRET_KEY: Joi.string().required(),

    TW_ENABLE_QUERY_LOGGING: Joi.boolean().default(false),

    TW_ENABLE_REQ_BODY_LOGGING: Joi.boolean().default(false),

    TW_MAIL_ENABLE: Joi.boolean().default(false),

    TW_MAIL_HOST: Joi.when("TW_MAIL_ENABLE", {
        is: true,
        then: Joi.string().required(),
        otherwise: Joi.string().allow("").optional(),
    }),

    TW_MAIL_PORT: Joi.when("TW_MAIL_ENABLE", {
        is: true,
        then: Joi.number().port().required(),
        otherwise: Joi.number().port().allow("").optional(),
    }),

    TW_MAIL_SECURE: Joi.when("TW_MAIL_ENABLE", {
        is: true,
        then: Joi.boolean().required(),
        otherwise: Joi.boolean().allow("").optional(),
    }),

    TW_MAIL_USER: Joi.when("TW_MAIL_ENABLE", {
        is: true,
        then: Joi.string().required(),
        otherwise: Joi.string().allow("").optional(),
    }),

    TW_MAIL_PASS: Joi.when("TW_MAIL_ENABLE", {
        is: true,
        then: Joi.string().required(),
        otherwise: Joi.string().allow("").optional(),
    }),

    TW_REDIS_HOST: Joi.when("TW_MAIL_ENABLE", {
        is: true,
        then: Joi.string().required(),
        otherwise: Joi.string().allow("").optional(),
    }),

    TW_REDIS_PORT: Joi.when("TW_MAIL_ENABLE", {
        is: true,
        then: Joi.number().port().required(),
        otherwise: Joi.number().port().allow("").optional(),
    }),
});
