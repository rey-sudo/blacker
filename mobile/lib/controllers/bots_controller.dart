import 'package:get/get.dart';

class BotsController extends GetxController {
  // Lista de bots como estado reactivo
  var bots = <Map<String, String>>[
    {"name": "BTCUSDT", "description": "Este es el bot número 1"},
    {"name": "ADAUSDT", "description": "Este es el bot número 2"},
    {"name": "Bot Gamma", "description": "Este es el bot número 3"},
    {"name": "Bot Gamma", "description": "Este es el bot número 3"},
    {"name": "Bot Gamma", "description": "Este es el bot número 3"},
    {"name": "Bot Gamma", "description": "Este es el bot número 3"},
    {"name": "Bot Gamma", "description": "Este es el bot número 3"},
    {"name": "Bot Gamma", "description": "Este es el bot número 3"},
    {"name": "Bot Gamma", "description": "Este es el bot número 3"},
    {"name": "Bot Gamma", "description": "Este es el bot número 3"},
    {"name": "Bot Gamma", "description": "Este es el bot número 3"},
    {"name": "Bot Gamma", "description": "Este es el bot número 3"},
    {"name": "Bot Gamma", "description": "Este es el bot número 3"},
    {"name": "Bot Gamma", "description": "Este es el bot número 3"},
    {"name": "Bot Gamma", "description": "Este es el bot número 3"},
    {"name": "Bot Gamma", "description": "Este es el bot número 3"},
  ].obs;

  // Método opcional para agregar un bot
  void agregarBot(Map<String, String> bot) {
    bots.add(bot);
  }

  // Método opcional para eliminar un bot
  void eliminarBot(int index) {
    bots.removeAt(index);
  }
}
