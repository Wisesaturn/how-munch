import { type ReactElement } from 'react';

import { toast, type ExternalToast } from 'sonner';

type ToastPromiseOptions<ToastData = unknown> = Parameters<typeof toast.promise<ToastData>>[1];

export class Toast {
  static success(message: string, options?: ExternalToast) {
    return toast.success(message, options);
  }

  static error(message: string, options?: ExternalToast) {
    return toast.error(message, options);
  }

  static info(message: string, options?: ExternalToast) {
    return toast.info(message, options);
  }

  static warn(message: string, options?: ExternalToast) {
    return toast.warning(message, options);
  }

  static loading(message: string, options?: ExternalToast) {
    return toast.loading(message, options);
  }

  static custom(jsx: (id: number | string) => ReactElement, options?: ExternalToast) {
    return toast.custom(jsx, options);
  }

  static dismiss(id?: number | string) {
    return toast.dismiss(id);
  }

  static promise<ToastData = unknown>(
    promise: Promise<ToastData>,
    options?: ToastPromiseOptions<ToastData>,
  ) {
    return toast.promise(promise, { ...options });
  }
}
