import { queryClient } from "./query";

export function invalidateTasks() {
  void queryClient.invalidateQueries({ queryKey: ["tasks"] });
}

export function invalidateBootstrap() {
  void queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
}

export function invalidateAll() {
  invalidateTasks();
  invalidateBootstrap();
}
