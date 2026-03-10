// This is a basic Flutter widget test.
import 'package:flutter_test/flutter_test.dart';
import 'package:leighton/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const LeightonApp());
    expect(find.text('Leighton Punchlist'), findsOneWidget);
  });
}
