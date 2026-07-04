# Android App

## Setup

### Prerequisites
- Android Studio 2021.1 or later
- JDK 11+
- Android SDK API 21+ (target API 33+)
- Kotlin support

### Project Structure

```
App/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/intelliron/shoppinglist/
│   │   │   │   ├── MainActivity.kt
│   │   │   │   ├── ui/
│   │   │   │   ├── data/
│   │   │   │   └── utils/
│   │   │   └── res/
│   │   └── test/
│   └── build.gradle
├── gradle/
└── settings.gradle
```

## Development

### Building

```bash
# Build APK
./gradlew build

# Build and run on emulator/device
./gradlew installDebug
```

### Architecture

- **MVVM Pattern:** ViewModel-based state management
- **Repository Pattern:** Data abstraction layer
- **LiveData/Flow:** Reactive state management
- **Dependency Injection:** Hilt-based DI

### Key Components

1. **Authentication** (`ui/auth/`)
   - Login/register screens
   - Session token management
   - Persistent login

2. **Shopping Lists** (`ui/lists/`)
   - List creation/deletion
   - List browsing
   - List detail view

3. **Items** (`ui/items/`)
   - Item CRUD operations
   - Completion toggle
   - Item search

4. **Sections** (`ui/sections/`)
   - Section management
   - Drag-and-drop organization
   - Item grouping

5. **Sync** (`utils/SyncManager.kt`)
   - Client-server synchronization
   - Offline queue management
   - Conflict resolution

### API Communication

API client configured in `data/api/RetrofitClient.kt`

- Base URL: `https://api.shoppinglist.intelliron.xyz/api/v1`
- Request interceptor for authentication
- Error handling and retry logic

### Local Storage

- **Session Token:** Encrypted SharedPreferences
- **List Data:** Room database (optional)
- **Sync State:** Preferences

## Testing

### Unit Tests
```bash
./gradlew test
```

### Instrumented Tests (on device/emulator)
```bash
./gradlew connectedAndroidTest
```

## Configuration

### API Endpoint

Edit `data/api/RetrofitClient.kt`:
```kotlin
const val BASE_URL = "https://api.shoppinglist.intelliron.xyz/api/v1/"
```

### Session Management

Configure in `data/local/SessionManager.kt`:
- Token storage
- Expiration handling
- Auto-refresh logic

## Deployment

### Build APK for Manual Installation

```bash
# Generate release APK
./gradlew assembleRelease
```

The APK will be located at `app/build/outputs/apk/release/app-release.apk`

To install on a device or emulator:
```bash
adb install app/build/outputs/apk/release/app-release.apk
```

**Note:** Release builds require a signing key. Android Studio will prompt you to create one on first release build, or configure it in `app/build.gradle`.

## Troubleshooting

**Gradle sync issues:**
- Invalidate caches: `File → Invalidate Caches → Restart`
- Update Gradle: `./gradlew wrapper --gradle-version latest`

**API connection errors:**
- Check BASE_URL in RetrofitClient
- Verify server is running
- Check Android manifest permissions

**Session token expired:**
- Tokens auto-refresh before expiration
- Manual refresh: Call `SessionManager.refreshToken()`

## Libraries

- AndroidX / Jetpack
- Retrofit 2 - HTTP client
- OkHttp - HTTP logging
- Kotlin Coroutines - Async
- Dagger/Hilt - DI
- LiveData/Flow - Reactive

See `build.gradle` for full dependency list.
