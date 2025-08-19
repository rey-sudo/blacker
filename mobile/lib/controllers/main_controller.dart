import 'package:get/get.dart';

class MainController extends GetxController {
  // Estado observable con Rx
  var currentIndex = 0.obs;

  void cambiarIndice(int nuevoIndice) {
    currentIndex.value = nuevoIndice;
  }
}
