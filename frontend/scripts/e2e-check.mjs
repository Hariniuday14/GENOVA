/**
 * Minimal end-to-end check without extra dependencies.
 *
 * Requires Chrome running with --remote-debugging-port=9222 and the Vite dev
 * server + FastAPI service running. Drives the real analysis form, clicks
 * "Run analysis", and verifies the browser lands on a populated results page.
 */

const CDP = "http://127.0.0.1:9222";
const APP = process.env.GENOVA_APP_URL ?? "http://127.0.0.1:5173";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const tabs = await fetch(`${CDP}/json/list`).then((response) => response.json());
  const page = tabs.find((tab) => tab.type === "page");

  if (!page) throw new Error("No Chrome page target found on port 9222.");

  const socket = new WebSocket(page.webSocketDebuggerUrl);
  const pending = new Map();
  let nextId = 0;

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  });

  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = ++nextId;
      pending.set(id, resolve);
      socket.send(JSON.stringify({ id, method, params }));
    });

  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.result?.exceptionDetails) {
      throw new Error(result.result.exceptionDetails.text);
    }
    return result.result?.result?.value;
  };

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Page.navigate", { url: `${APP}/analysis` });
  await sleep(4000);

  const buttonState = await evaluate(`(() => {
    const button = [...document.querySelectorAll("button")]
      .find((item) => item.textContent.trim().startsWith("Run analysis"));
    if (!button) return "missing";
    if (button.disabled) return "disabled";
    button.click();
    return "clicked";
  })()`);

  await sleep(3500);

  const state = await evaluate(`JSON.stringify({
    path: location.pathname,
    heading: document.querySelector("h1")?.textContent ?? null,
    runId: (document.body.innerText.match(/GENOVA-\\d{8}T\\d{6}-\\d{3}/) ?? [null])[0],
    ranked: document.body.innerText.includes("Ranked candidates"),
    topGene: document.body.innerText.includes("GENE_ALPHA"),
    errorVisible: /Analysis failed|API offline/.test(document.body.innerText)
  })`);

  const parsed = JSON.parse(state);

  // Validation path: exclude every candidate and confirm the form refuses to run.
  await send("Page.navigate", { url: `${APP}/analysis` });
  await sleep(3000);

  await evaluate(`(() => {
    document.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      if (input.checked) input.click();
    });
    return true;
  })()`);
  await sleep(300);

  const validationState = await evaluate(`(() => {
    const button = [...document.querySelectorAll("button")]
      .find((item) => item.textContent.trim().startsWith("Run analysis"));
    button?.click();
    return new Promise((resolve) => setTimeout(() => resolve(JSON.stringify({
      path: location.pathname,
      messageShown: document.body.innerText.includes("Select at least one candidate variant")
    })), 700));
  })()`);

  console.log(
    JSON.stringify(
      { buttonState, ...parsed, validation: JSON.parse(validationState) },
      null,
      2,
    ),
  );

  socket.close();

  const validation = JSON.parse(validationState);
  const ok =
    buttonState === "clicked" &&
    parsed.path === "/results" &&
    parsed.ranked &&
    parsed.topGene &&
    !parsed.errorVisible &&
    validation.path === "/analysis" &&
    validation.messageShown;

  if (!ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
