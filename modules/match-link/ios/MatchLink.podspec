require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

# Without this file CocoaPods never sees the Swift, and the build succeeds with
# the module silently missing — the app then runs with the feature simply absent
# rather than failing in any way you would notice.
Pod::Spec.new do |s|
  s.name           = 'MatchLink'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.author         = 'MatchPoint'
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.license        = { :type => 'MIT' }
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
end
