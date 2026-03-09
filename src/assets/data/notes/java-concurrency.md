# Java Concurrency Deep Dive

## Thread Lifecycle

A Java thread moves through the following states:
NEW → RUNNABLE → (BLOCKED | WAITING | TIMED_WAITING) → TERMINATED

## The `synchronized` Keyword

Acquires the **intrinsic lock** (monitor) on an object. Only one thread
can hold a lock at a time.
```java
// Method-level lock (locks on 'this')
public synchronized void increment() { count++; }

// Block-level lock (finer granularity)
public void increment() {
    synchronized (this) { count++; }
}
```

## `volatile`

Guarantees **visibility** — writes by one thread are immediately visible
to others. Does **not** guarantee atomicity.
```java
private volatile boolean running = true;
```

## `java.util.concurrent` Highlights

| Class | Use |
|---|---|
| `AtomicInteger` | Lock-free integer operations |
| `ReentrantLock` | Explicit lock with try-lock, timed lock |
| `CountDownLatch` | Wait for N events to complete |
| `CyclicBarrier` | Synchronise N threads at a point |
| `ExecutorService` | Thread pool management |
| `CompletableFuture` | Async composition pipeline |

## Virtual Threads (Java 21+)
```java
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    executor.submit(() -> callExternalApi());
}
```

Virtual threads are **lightweight** — millions can coexist. They are
ideal for I/O-bound workloads and simplify reactive code.