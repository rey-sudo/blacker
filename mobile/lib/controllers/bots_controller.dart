import 'package:get/get.dart';

class BotsController extends GetxController {
  // Lista de bots como estado reactivo
  var bots = <Map<String, dynamic>>[
    {
      "name": "BTCUSDT",
      "description": "Slave 0",
      "enabled": true.obs,
    },
    {
      "name": "ADAUSDT",
      "description": "Slave 1",
      "enabled": true.obs,
    },
    {
      "name": "ETHUSDT",
      "description": "Este es el bot número 3",
      "enabled": true.obs,
    },
    {
      "name": "LTEUSDT",
      "description": "Este es el bot número 3",
      "enabled": true.obs,
    },
    {
      "name": "BNBUSDT",
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


  void agregarBot(Map<String, String> bot) {
    bots.add(bot);
  }

  void eliminarBot(int index) {
    bots.removeAt(index);
  }

  void updateBotStatus(Map<String, dynamic> bot, bool value) {
    bot["enabled"].value = value;
  }
}
