import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'pages/home_page.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:permission_handler/permission_handler.dart';

final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
    FlutterLocalNotificationsPlugin();

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  //  --dart-define (default: development)
  const String env = String.fromEnvironment('ENV', defaultValue: 'development');

  final envFile = switch (env) {
    'production' => '.env.production',
    'staging' => '.env.staging',
    _ => '.env.development',
  };

  await dotenv.load(fileName: envFile);

  // 🔔 Inicializar notificaciones locales
  const AndroidInitializationSettings initializationSettingsAndroid =
      AndroidInitializationSettings('@mipmap/ic_launcher');

  const DarwinInitializationSettings initializationSettingsIOS =
      DarwinInitializationSettings();

  const InitializationSettings initializationSettings =
      InitializationSettings(
        android: initializationSettingsAndroid,
        iOS: initializationSettingsIOS,
      );

  await flutterLocalNotificationsPlugin.initialize(initializationSettings);

  runApp(const MyApp());
}

Future<void> solicitarPermisoNotificaciones() async {
  if (await Permission.notification.isDenied) {
    await Permission.notification.request();
  }
}

/// 🔔 Función para mostrar notificación con sonido .wav
Future<void> mostrarNotificacion(String titulo, String cuerpo) async {
  const AndroidNotificationDetails androidPlatformChannelSpecifics =
      AndroidNotificationDetails(
    'canal_query', // ID único del canal
    'Consultas DB', // Nombre
    channelDescription: 'Notificaciones cuando se hace query',
    importance: Importance.max,
    priority: Priority.high,
    playSound: true,
    sound: RawResourceAndroidNotificationSound('sound'), 
     ticker: 'notificacion',
  );

  const DarwinNotificationDetails iOSPlatformChannelSpecifics =
      DarwinNotificationDetails(
    presentSound: true,
    sound: 'sound.wav', // en iOS sí lleva extensión
  );

  const NotificationDetails platformChannelSpecifics = NotificationDetails(
    android: androidPlatformChannelSpecifics,
    iOS: iOSPlatformChannelSpecifics,
  );

  await flutterLocalNotificationsPlugin.show(
    0, // id
    titulo,
    cuerpo,
    platformChannelSpecifics,
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ScreenUtilInit(
      designSize: const Size(414, 896),
      minTextAdapt: true,
      builder: (context, child) {
        return GetMaterialApp(
          title: 'Blacker',
          debugShowCheckedModeBanner: false,
          theme: ThemeData(
            primaryColor: Colors.blue,
            fontFamily: 'Inter',
            primarySwatch: Colors.blue,
            dividerColor: Colors.grey.withAlpha(50),
            textTheme: TextTheme(
              bodySmall: TextStyle(fontSize: 11.sp),
              bodyMedium: TextStyle(fontSize: 14.sp),
              bodyLarge: TextStyle(fontSize: 16.sp),
              titleMedium:
                  TextStyle(fontSize: 20.sp, fontWeight: FontWeight.w500),
              titleLarge:
                  TextStyle(fontSize: 24.sp, fontWeight: FontWeight.bold),
              headlineMedium:
                  TextStyle(fontSize: 28.sp, fontWeight: FontWeight.bold),
              headlineLarge:
                  TextStyle(fontSize: 32.sp, fontWeight: FontWeight.bold),
            ),
          ),
          home: PageStorage(
            bucket: PageStorageBucket(),
            child: const HomePage(),
          ),
        );
      },
      child: const HomePage(),
    );
  }
}
