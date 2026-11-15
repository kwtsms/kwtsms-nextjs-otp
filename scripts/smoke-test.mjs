/*
FILE:      scripts/smoke-test.mjs
CREATED:   2026-11-15 11:50 +03
TASK:      workqueue job 12
AUTHOR:    M Alhassoun
WHAT:      Manual smoke test: one test=1 send through the kwtsms client to KWTSMS_TEST_NUMBER.
WHY:       Proves your credentials, Sender ID and number format against the real API before going live. test=1 queues the message, nothing is delivered and credits are held until you delete it in the queue.
USAGE:     Fill .env.local (KWTSMS_USERNAME, KWTSMS_PASSWORD, KWTSMS_SENDER_ID, KWTSMS_TEST_NUMBER), then `npm run smoke`.
DEPENDS:   kwtsms npm package, Node 24 (--env-file).
*/
import { KwtSMS, maskPhone } from "kwtsms";

const { KWTSMS_USERNAME: user, KWTSMS_PASSWORD: pass, KWTSMS_SENDER_ID: sender, KWTSMS_TEST_NUMBER: to } = process.env;

if (process.env.KWTSMS_LIVE === "1") {
  console.error("Refusing: KWTSMS_LIVE=1. The smoke test is always test=1; unset it.");
  process.exit(1);
}
if (!user || !pass) {
  console.error("Set KWTSMS_USERNAME and KWTSMS_PASSWORD in .env.local");
  process.exit(1);
}
if (!to || /X/i.test(to)) {
  console.error("Set KWTSMS_TEST_NUMBER to your own number in 965XXXXXXXX format (digits only)");
  process.exit(1);
}

const sms = new KwtSMS(user, pass, { senderId: sender || "KWT-SMS", testMode: true, logFile: "", appName: "kwtsms-nextjs-otp-smoke" });
const res = await sms.send(to, "kwtsms-nextjs-otp smoke test. Code 123456.");
console.log(`to ${maskPhone(to)} test=1 ->`, res.result, res.code ?? "", res["msg-id"] ?? "", res.description ?? "");
if (res.result === "OK") {
  console.log("Queued, not delivered. Delete it in kwtsms.com > Queue to release the held credits.");
}
process.exit(res.result === "OK" ? 0 : 1);
