require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

# Named after the module directory, matching what expo-modules-autolinking
# looks for. Without this file CocoaPods never compiles the Swift, and the build
# still succeeds — with the module silently missing from the binary.
Pod::Spec.new do |s|
  s.name           = 'match-link'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = 'MIT'
  s.author         = 'MatchPoint'
  s.homepage       = 'https://github.com/iraklidzadzamia/matchpoint'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/iraklidzadzamia/matchpoint.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
end
