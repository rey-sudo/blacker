import 'package:get/get.dart';

class BotsController extends GetxController {
  // Lista de bots como estado reactivo
  var bots = <Map<String, dynamic>>[
    {
      "name": "BTCUSDT",
      "description": "Este es el bot número 1",
      "enabled": true.obs,
    },
    {
      "name": "ADAUSDT",
      "description": "Este es el bot número 2",
      "enabled": true.obs,
    },
    {
      "name": "Bot Gamma",
      "description": "Este es el bot número 3",
      "enabled": true.obs,
    },
    {
      "name": "Bot Gamma",
      "description": "Este es el bot número 3",
      "enabled": true.obs,
    },
    {
      "name": "Bot Gamma",
      "description": "Este es el bot número 3",
      "enabled": true.obs,
    },
    {
      "name": "Bot Gamma",
      "description": "Este es el bot número 3",
      "enabled": true.obs,
    },
    {
      "name": "Bot Gamma",
      "description": "Este es el bot número 3",
      "enabled": true.obs,
    },
    {
      "name": "Bot Gamma",
      "description": "Este es el bot número 3",
      "enabled": true.obs,
    },
    {
      "name": "Bot Gamma",
      "description": "Este es el bot número 3",
      "enabled": true.obs,
    },
    {
      "name": "Bot Gamma",
      "description": "Este es el bot número 3",
      "enabled": true.obs,
    },
    {
      "name": "Bot Gamma",
      "description": "Este es el bot número 3",
      "enabled": true.obs,
    },
    {
      "name": "Bot Gamma",
      "description": "Este es el bot número 3",
      "enabled": true.obs,
    },
    {
      "name": "Bot Gamma",
      "description": "Este es el bot número 3",
      "enabled": true.obs,
    },
    {
      "name": "Bot Gamma",
      "description": "Este es el bot número 3",
      "enabled": true.obs,
    },
    {
      "name": "Bot Gamma",
      "description": "Este es el bot número 3",
      "enabled": true.obs,
    },
    {
      "name": "Bot Gamma",
      "description": "Este es el bot número 3",
      "enabled": true.obs,
    },
  ].obs;

  // Método opcional para agregar un bot
  void agregarBot(Map<String, String> bot) {
    bots.add(bot);
  }

  // Método opcional para eliminar un bot
  void eliminarBot(int index) {
    bots.removeAt(index);
  }

  void updateBotStatus(Map<String, dynamic> bot, bool value) {
    bot["enabled"].value = value;
  }
}
