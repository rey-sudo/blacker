import 'package:get/get.dart';

class MainController extends GetxController {
  // Estado observable con Rx
  var indiceActual = 0.obs;

  void cambiarIndice(int nuevoIndice) {
    indiceActual.value = nuevoIndice;
  }
}
