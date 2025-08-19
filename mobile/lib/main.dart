import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'pages/home_page.dart';

void main() {
  runApp(const MyApp());
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
            fontFamily: 'Inter',
            primarySwatch: Colors.blue,
            dividerColor: Colors.grey.withAlpha(50),
            textTheme: TextTheme(
              bodySmall: TextStyle(fontSize: 11.sp),
              bodyMedium: TextStyle(fontSize: 14.sp),
              bodyLarge: TextStyle(fontSize: 16.sp),
              titleMedium: TextStyle(fontSize: 20.sp, fontWeight: FontWeight.w500),
              titleLarge: TextStyle(fontSize: 24.sp, fontWeight: FontWeight.bold),
              headlineMedium: TextStyle(fontSize: 28.sp, fontWeight: FontWeight.bold),
              headlineLarge: TextStyle(fontSize: 32.sp, fontWeight: FontWeight.bold),
            ),
          ),
          home: child,
        );
      },
      child: const HomePage(),
    );
  }
}
