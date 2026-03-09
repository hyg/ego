const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const fs = require('fs');
const path = require('path');

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const schemaDir = path.join(__dirname, '..', 'data', 'schema');

const schemas = {
    season: loadSchema('season'),
    day: loadSchema('day'),
    voucher: loadSchema('voucher'),
    task: loadSchema('task')
};

function loadSchema(name) {
    const schemaPath = path.join(schemaDir, `${name}.json`);
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    return ajv.compile(schema);
}

function validateSeason(data) {
    return validate('season', data);
}

function validateDay(data) {
    return validate('day', data);
}

function validateVoucher(data) {
    return validate('voucher', data);
}

function validateTask(data) {
    return validate('task', data);
}

function validate(name, data) {
    const validateFn = schemas[name];
    if (!validateFn) {
        throw new Error(`Unknown schema: ${name}`);
    }
    
    const valid = validateFn(data);
    if (!valid) {
        return {
            valid: false,
            errors: validateFn.errors
        };
    }
    return { valid: true };
}

function getSchemaPath(name) {
    return path.join(schemaDir, `${name}.json`);
}

module.exports = {
    validateSeason,
    validateDay,
    validateVoucher,
    validateTask,
    validate,
    getSchemaPath,
    schemas
};
