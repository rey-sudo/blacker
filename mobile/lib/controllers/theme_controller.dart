import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

class AppTheme {
  static TextTheme commonTextTheme = TextTheme(
    bodySmall: TextStyle(fontSize: 11.sp),
    bodyMedium: TextStyle(fontSize: 14.sp),
    bodyLarge: TextStyle(fontSize: 16.sp),
    titleMedium: TextStyle(fontSize: 20.sp, fontWeight: FontWeight.w500),
    titleLarge: TextStyle(fontSize: 24.sp, fontWeight: FontWeight.bold),
    headlineMedium: TextStyle(fontSize: 28.sp, fontWeight: FontWeight.bold),
    headlineLarge: TextStyle(fontSize: 32.sp, fontWeight: FontWeight.bold),
  );

  /// 🌙 Tema oscuro estilo "Dark Night"
  static ThemeData darkNight = ThemeData(
    brightness: Brightness.dark,
    fontFamily: 'Inter',
    scaffoldBackgroundColor: const Color(0xFF0B0E11),
    dividerColor: Colors.grey.withAlpha(50),

    colorScheme: const ColorScheme(
      brightness: Brightness.dark,
      primary: Color(0xFFFCD535),
      onPrimary: Colors.black,
      secondary: Color(0xFFFCD535),
      onSecondary: Colors.black,
      surface: Color(0xFF181A20),
      onSurface: Colors.white,
      error: Color(0xFFCF304A),
      onError: Colors.white,
    ),

    appBarTheme: const AppBarTheme(
      backgroundColor: Color(0xFF181A20),
      foregroundColor: Colors.white,
      iconTheme: IconThemeData(color: Colors.white),
      elevation: 0,
      titleTextStyle: TextStyle(
        fontFamily: 'Inter',
        fontWeight: FontWeight.w600,
        fontSize: 18,
        color: Colors.white,
      ),
    ),

    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: Color(0xFF181A20),
      selectedItemColor: Color(0xFFFCD535),
      unselectedItemColor: Colors.white54,
      showSelectedLabels: true,
      showUnselectedLabels: true,
    ),
    
    textTheme: commonTextTheme,
  );

  /// ☀️ Tema claro
  static ThemeData light = ThemeData(
    brightness: Brightness.light,
    primaryColor: Colors.blue,
    primarySwatch: Colors.blue,
    fontFamily: 'Inter',
    scaffoldBackgroundColor: Colors.white,
    dividerColor: Colors.grey.withAlpha(50),
    colorScheme: ColorScheme.fromSeed(
      seedColor: Colors.blue,
      brightness: Brightness.light,
      surface: const Color(0xFFF6F8FA),
      error: Colors.redAccent,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      foregroundColor: Colors.black,
      iconTheme: IconThemeData(color: Colors.black),
      elevation: 0,
    ),
    textTheme: commonTextTheme,
  );
}

class ThemeController extends GetxController {
  var isDark = true.obs;

  ThemeData get theme => isDark.value ? AppTheme.darkNight : AppTheme.light;

  void toggleTheme() {
    isDark.value = !isDark.value;
    Get.changeTheme(theme);
  }
}
