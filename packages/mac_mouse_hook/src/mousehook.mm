#include <napi.h>
#include <thread>
#include <atomic>
#import <CoreGraphics/CoreGraphics.h>
#import <ApplicationServices/ApplicationServices.h>

static Napi::ThreadSafeFunction tsfn;
static CFMachPortRef eventTap = nullptr;
static CFRunLoopSourceRef runLoopSource = nullptr;
static std::atomic<bool> isRunning{false};

CGEventRef mouseCallback(CGEventTapProxy, CGEventType type, CGEventRef event, void*) {
  if (!isRunning.load()) {
    return event;
  }
  
  if (type == kCGEventLeftMouseUp || type == kCGEventRightMouseUp) {
    CGPoint pos = CGEventGetLocation(event);
    if (tsfn) {
      tsfn.BlockingCall([pos, type](Napi::Env env, Napi::Function jsCallback) {
        Napi::Object evt = Napi::Object::New(env);
        evt.Set("x", pos.x);
        evt.Set("y", pos.y);
        evt.Set("button", type == kCGEventLeftMouseUp ? "left" : "right");
        jsCallback.Call({ evt });
      });
    }
  }
  return event;
}

Napi::Value Start(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (isRunning.load()) {
    return env.Undefined();
  }
  
  Napi::Function jsCallback = info[0].As<Napi::Function>();
  tsfn = Napi::ThreadSafeFunction::New(env, jsCallback, "mousehook", 0, 1);

  // Check accessibility permissions
  if (!AXIsProcessTrusted()) {
    Napi::TypeError::New(env, "Accessibility permissions required. Please enable in System Preferences > Security & Privacy > Privacy > Accessibility").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  eventTap = CGEventTapCreate(
      kCGSessionEventTap,
      kCGHeadInsertEventTap,
      kCGEventTapOptionDefault,
      CGEventMaskBit(kCGEventLeftMouseUp) | CGEventMaskBit(kCGEventRightMouseUp),
      mouseCallback,
      nullptr);

  if (!eventTap) {
    Napi::TypeError::New(env, "Failed to create event tap. Check accessibility permissions.").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, eventTap, 0);
  if (!runLoopSource) {
    CFRelease(eventTap);
    eventTap = nullptr;
    Napi::TypeError::New(env, "Failed to create run loop source").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  CFRunLoopAddSource(CFRunLoopGetCurrent(), runLoopSource, kCFRunLoopCommonModes);
  CGEventTapEnable(eventTap, true);
  
  isRunning.store(true);

  std::thread([] { 
    CFRunLoopRun(); 
  }).detach();
  
  return env.Undefined();
}

Napi::Value Stop(const Napi::CallbackInfo& info) {
  if (!isRunning.load()) {
    return info.Env().Undefined();
  }
  
  isRunning.store(false);
  
  if (eventTap) {
    CGEventTapEnable(eventTap, false);
    CFRelease(eventTap);
    eventTap = nullptr;
  }
  
  if (runLoopSource) {
    CFRunLoopRemoveSource(CFRunLoopGetCurrent(), runLoopSource, kCFRunLoopCommonModes);
    CFRelease(runLoopSource);
    runLoopSource = nullptr;
  }
  
  if (tsfn) {
    tsfn.Release();
    tsfn = nullptr;
  }
  
  return info.Env().Undefined();
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("start", Napi::Function::New(env, Start));
  exports.Set("stop", Napi::Function::New(env, Stop));
  return exports;
}

NODE_API_MODULE(mousehook, Init)
