import {InjectorService, LocalsContainer} from "@tsed/di";
import {EndpointMetadata} from "../../mvc/models/EndpointMetadata";
import {PlatformRequest} from "../services/PlatformRequest";
import {PlatformResponse} from "../services/PlatformResponse";
import {RequestLogger} from "./RequestLogger";

export interface RequestContextOptions {
  id: string;
  logger: any;
  url: string;
  ignoreUrlPatterns?: any[];
  level?: "debug" | "info" | "warn" | "error" | "off";
  maxStackSize?: number;
  injector?: InjectorService;
  response?: PlatformResponse;
  request?: PlatformRequest;
  endpoint?: EndpointMetadata;
}

export class RequestContext extends Map<any, any> {
  /**
   * Request id generated by @@contextMiddleware@@.
   *
   * ::: tip
   * By default Ts.ED generate uuid like that `uuidv4().replace(/-/gi, ""))`.
   * Dash are removed to simplify tracking logs in Kibana
   * :::
   *
   * ::: tip
   * Request id can by customized by changing the server configuration.
   *
   * ```typescript
   * @Configuration({
   *   logger: {
   *     reqIdBuilder: createUniqId // give your own id generator function
   *   }
   * })
   * class Server {
   *
   * }
   * ```
   * :::
   *
   */
  readonly id: string;
  /**
   * Date when request have been handled by the server. @@RequestLogger@@ use this date to log request duration.
   */
  readonly dateStart: Date = new Date();
  /**
   * The request container used by the Ts.ED DI. It contain all services annotated with `@Scope(ProviderScope.REQUEST)`
   */
  public container = new LocalsContainer<any>();
  /**
   * The current @@EndpointMetadata@@ resolved by Ts.ED during the request.
   */
  public endpoint: EndpointMetadata;
  /**
   * The data return by the previous endpoint if you use multiple handler on the same route. By default data is empty.
   */
  public data: any;
  /**
   * Logger attached to the context request.
   */
  public logger: RequestLogger;
  /**
   * The current @@PlatformResponse@@.
   */
  public response: PlatformResponse;
  /**
   * The current @@PlatformRequest@@.
   */
  public request: PlatformRequest;
  /**
   *
   */
  public injector: InjectorService;

  constructor({id, injector, logger, response, request, endpoint, ...options}: RequestContextOptions) {
    super();
    this.id = id;

    injector && (this.injector = injector);
    response && (this.response = response);
    request && (this.request = request);
    endpoint && (this.endpoint = endpoint);

    this.logger = new RequestLogger(logger, {
      id,
      startDate: this.dateStart,
      ...options
    });
  }

  get env() {
    return this.injector.settings.env;
  }

  async destroy() {
    await this.container.destroy();
    this.logger.destroy();
    this.response.destroy();
    this.request.destroy();
    // @ts-ignore
    delete this.container;
    // @ts-ignore
    delete this.logger;
    // @ts-ignore
    delete this.injector;
    // @ts-ignore
    delete this.endpoint;
    // @ts-ignore
    delete this.response;
  }

  async emit(eventName: string, ...args: any[]) {
    return this.injector && this.injector.emit(eventName, ...args);
  }
}
