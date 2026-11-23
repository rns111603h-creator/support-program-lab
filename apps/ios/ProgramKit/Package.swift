// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ProgramKit",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [.library(name: "ProgramKit", targets: ["ProgramKit"])],
    targets: [
        .target(name: "ProgramKit"),
        .testTarget(name: "ProgramKitTests", dependencies: ["ProgramKit"]),
    ]
)
