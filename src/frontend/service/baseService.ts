import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

export abstract class BaseService {
  protected api: AxiosInstance;
  protected baseURL: string;

  constructor() {
    this.baseURL = "/";
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        "Content-Type": "application/json",
      },
      withCredentials: true,
    });

    this.setupInterceptors();
  }

  protected setupInterceptors(): void {
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error) => {
        if (error.response) {
          // Handle specific error codes
          switch (error.response.status) {
            case 401:
              console.log("Unauthorized access");
              break;
            case 403:
              console.log("Forbidden access");
              break;
            case 422:
              console.log("Validation error:", error.response.data);
              break;
            case 500:
              console.log("Server error");
              break;
            default:
              console.log("API error:", error?.response?.data);
          }
        }
        return Promise.reject(error);
      },
    );
  }

  protected async get<T>(
    url: string,
    params?: Record<string, unknown>,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.api.get(url, {
      ...config,
      params,
    });
    return response.data;
  }

  protected async post<T>(
    url: string,
    data?: unknown,
    params?: Record<string, unknown>,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.api.post(url, data, {
      ...config,
      params,
    });
    return response.data;
  }

  protected async put<T>(
    url: string,
    data?: unknown,
    params?: Record<string, unknown>,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.api.put(url, data, {
      ...config,
      params,
    });
    return response.data;
  }

  protected async delete<T>(
    url: string,
    data?: unknown,
    params?: Record<string, unknown>,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.api.delete(url, {
      ...config,
      data: data,
      params,
    });
    return response.data;
  }

  protected async patch<T>(
    url: string,
    data?: unknown,
    params?: Record<string, unknown>,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.api.patch(url, data, {
      ...config,
      params,
    });
    return response.data;
  }
}
