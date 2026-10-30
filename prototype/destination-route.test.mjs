import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const window = {};
runInNewContext(readFileSync(new URL("./destination-route.js", import.meta.url), "utf8"), { window });
const route = window.uaDeDestinationRoute;
const base = {
  stage: "planning", protection_basis: "applying", residence_restriction: "no",
  housing: "none", funding: "none", destination_housing: "none",
  destination_family: "none", destination_opportunity: "none", destination_medical: "no",
};
const check = (city, answers = {}) => route.evaluate({ ...base, destination_city: city, ...answers }).requested;

assert.equal(check("Мюнхен").city, "München");
assert.equal(check("Мюнхен").code, "distribution");
assert.equal(check("Ганновер").code, "distribution");
assert.equal(check("Берлин").code, "distribution");
assert.equal(check("Лейпциг").code, "leipzigNo");
assert.equal(check("Берлин", { protection_basis: "unknown" }).code, "scopeUnknown");
assert.equal(check("Берлин", { stage: "registered", residence_restriction: "yes" }).code, "restrictionResult");
assert.equal(check("Берлин", { destination_family: "spouse", destination_family_proof: "yes" }).code, "evidence");
assert.equal(check("Берлин", { destination_family: "spouse", destination_family_proof: "unknown" }).detail, "evidenceMissing");
assert.equal(check("Берлин", { destination_housing: "stable", destination_housing_proof: "yes", destination_housing_2y: "no" }).detail, "evidenceMissing");
assert.equal(check("Берлин", { destination_housing: "stable", destination_housing_proof: "yes", destination_housing_2y: "yes" }).detail, "evidenceWhy");
assert.equal(check("Лейпциг", { destination_housing: "stable", destination_housing_proof: "yes", destination_rent_12m: "yes" }).detail, "evidenceWhy");
assert.equal(check("Лейпциг", { destination_housing: "stable", destination_housing_proof: "yes", destination_rent_12m: "no" }).code, "leipzigNo");
assert.equal(check("München", { housing: "stable", funding: "full", destination_housing: "stable", destination_housing_proof: "yes" }).code, "privateRoute");
assert.equal(check("Hannover", { housing: "stable", funding: "full", destination_housing: "stable", destination_housing_proof: "yes" }).code, "privateRoute");
assert.equal(check("Bremen").code, "unknownCity");
const alternatives = route.evaluate({ ...base, destination_city: "Berlin", destination_family: "spouse", destination_family_proof: "yes" }).alternatives;
assert.ok(alternatives.every((item) => item.code === "altNeedsFacts"));
console.log("Destination route checks passed");
