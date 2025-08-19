import 'package:flutter/material.dart';

class BotsPage extends StatelessWidget {
  const BotsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final List<Map<String, String>> bots = [
      {"name": "Bot Alpha", "description": "Este es el bot número 1"},
      {"name": "Bot Beta", "description": "Este es el bot número 2"},
      {"name": "Bot Gamma", "description": "Este es el bot número 3"},
    ];

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: bots.length,
      itemBuilder: (context, index) {
        final bot = bots[index];
        return Card(
          margin: const EdgeInsets.symmetric(vertical: 8),
          elevation: 3,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          child: ListTile(
            leading: const Icon(Icons.android, size: 40),
            title: Text(bot["name"]!, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            subtitle: Text(bot["description"]!),
            trailing: const Icon(Icons.arrow_forward_ios),
          ),
        );
      },
    );
  }
}
