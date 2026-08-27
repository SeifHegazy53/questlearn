import { Controller, Get, HttpException, HttpStatus } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { HealthReport, HealthService } from "./health.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: "Report API, database, and Redis connectivity status",
  })
  @ApiOkResponse({
    description: "Connected (or Redis-only degraded) -- the full connectivity report.",
  })
  @ApiResponse({
    status: 503,
    description: "Database unreachable -- same report body, non-2xx status so automated health checks don't need to parse it.",
  })
  async check(): Promise<HealthReport> {
    const report = await this.healthService.getReport();

    // Module 10.4 / ADR 0004: a genuine 503 when the database is
    // unreachable, so a platform health check (Render's own, or any
    // external uptime monitor) can tell "this instance cannot serve
    // real requests" from the status code alone. Redis-only
    // disconnection stays 200 (see HealthReport.degraded) -- Redis
    // backs rate limiting, not core correctness, so it doesn't get
    // the same severity.
    if (report.database === "disconnected") {
      throw new HttpException(report, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return report;
  }
}
