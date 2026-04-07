import type { AnalyticsSink, AnalyticsEvent } from "./index.js";
import { createLogger } from "../../shared/logging/index.js";

const logger = createLogger("analytics:composite");

export class CompositeSink implements AnalyticsSink {
  constructor(private readonly sinks: AnalyticsSink[]) {}

  record(event: AnalyticsEvent): void {
    for (const sink of this.sinks) {
      try {
        sink.record(event);
      } catch (err) {
        logger.warn(
          { sink: sink.constructor.name, event: event.event, err },
          "Sink failed — continuing to next",
        );
      }
    }
  }
}
