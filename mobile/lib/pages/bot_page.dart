import 'package:flutter/material.dart';
import 'package:get/get.dart';

class BotPage extends StatelessWidget {
  final Map<String, dynamic> bot;

  const BotPage({super.key, required this.bot});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(bot["name"] ?? "Bot"),
        backgroundColor: Colors.white,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "Description:",
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 4),
            Text(
              bot["description"] ?? "No description available",
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 16),
            Text(
              "Status:",
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 4),
            Text(
              bot["enabled"]?.value == true ? "Active" : "Inactive",
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(color: bot["enabled"]?.value == true ? Colors.green : Colors.red),
            ),
            const SizedBox(height: 16),
            Text(
              "PnL (USD):",
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 4),
            Text(
              "\$1,250.50", // Aquí luego puedes reemplazar por el valor real
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(color: Colors.green, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
    );
  }
}
