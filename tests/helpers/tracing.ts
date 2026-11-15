import { AsyncLocalStorage } from "node:async_hooks";
import {
  type Context,
  type ContextManager,
  ROOT_CONTEXT,
  context,
  trace,
} from "@opentelemetry/api";
import { BasicTracerProvider } from "@opentelemetry/sdk-trace-base";

/**
 * Turns on real OpenTelemetry in a test: spans get real ids, and a span started inside
 * another one knows its parent. In the app `@vercel/otel` does this at server start.
 */
class AsyncContextManager implements ContextManager {
  private storage = new AsyncLocalStorage<Context>();

  active() {
    return this.storage.getStore() ?? ROOT_CONTEXT;
  }

  with<A extends unknown[], F extends (...args: A) => ReturnType<F>>(
    ctx: Context,
    fn: F,
    thisArg?: ThisParameterType<F>,
    ...args: A
  ): ReturnType<F> {
    return this.storage.run(ctx, () => fn.call(thisArg, ...args));
  }

  bind<T>(_ctx: Context, target: T) {
    return target;
  }

  enable() {
    return this;
  }

  disable() {
    this.storage.disable();

    return this;
  }
}

export function enableTracing() {
  context.setGlobalContextManager(new AsyncContextManager());
  trace.setGlobalTracerProvider(new BasicTracerProvider());
}
