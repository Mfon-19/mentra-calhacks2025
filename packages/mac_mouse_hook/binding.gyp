{
  "targets": [
    {
      "target_name": "mousehook",
      "sources": ["src/mousehook.mm"],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "defines": [
        "NAPI_DISABLE_CPP_EXCEPTIONS",
        "NAPI_VERSION=8"
      ],
      "xcode_settings": {
        "MACOSX_DEPLOYMENT_TARGET": "11.0",
        "OTHER_CPLUSPLUSFLAGS": [
          "-std=c++17"
        ]
      }
    }
  ]
}
